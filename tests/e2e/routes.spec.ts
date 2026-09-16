import { expect, test } from "@playwright/test";

import { createAxeBuilder } from "../helpers/axe";

const routes = [
  { path: "/", heading: /Understand relationship changes/ },
  { path: "/app", heading: /Your export stays on your device/ },
  { path: "/story-downloader", heading: /View public Stories/ },
  { path: "/how-it-works", heading: /Official export in/ },
  { path: "/privacy", heading: /Two features, two explicit data boundaries/ },
  { path: "/terms", heading: /Use the service responsibly/ },
  { path: "/faq", heading: /What the product can/ },
] as const;

for (const route of routes) {
  test(`${route.path} renders its route shell`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  });
}

test("foundation pages have no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await createAxeBuilder(page).analyze();
  expect(results.violations).toEqual([]);
});

test("Story shell performs no provider request", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") {
      externalRequests.push(url.href);
    }
  });

  await page.goto("/story-downloader");
  await expect(page.getByText("Story lookup is not enabled yet", { exact: false })).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test("IndexedDB history survives a page reload", async ({ page }) => {
  await page.goto("/app");
  const databaseName = "social-relationship-analyzer-e2e";
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("snapshots", { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("snapshots", "readwrite");
        transaction.objectStore("snapshots").put({ id: "reload-proof", snapshotAt: 123 });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, databaseName);

  await page.reload();
  const stored = await page.evaluate(async (name) => {
    return new Promise<{ id: string; snapshotAt: number } | undefined>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("snapshots", "readonly");
        const getRequest = transaction.objectStore("snapshots").get("reload-proof");
        getRequest.onsuccess = () => resolve(
          getRequest.result as { id: string; snapshotAt: number } | undefined,
        );
        getRequest.onerror = () => reject(getRequest.error);
        transaction.oncomplete = () => database.close();
      };
    });
  }, databaseName);
  expect(stored).toEqual({ id: "reload-proof", snapshotAt: 123 });
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, databaseName);
});
