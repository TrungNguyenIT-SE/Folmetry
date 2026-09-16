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

test("locale and theme preferences survive reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "VI" }).click();
  await page.getByRole("combobox", { name: "Giao diện" }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(async () => {
    return new Promise<string[]>((resolve, reject) => {
      const request = indexedDB.open("social-relationship-analyzer");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("settings", "readonly");
        const getAll = transaction.objectStore("settings").getAll();
        getAll.onsuccess = () => resolve(
          (getAll.result as { key: string; value: unknown }[])
            .map((setting) => `${setting.key}:${String(setting.value)}`)
            .sort(),
        );
        getAll.onerror = () => reject(getAll.error);
        transaction.oncomplete = () => database.close();
      };
    });
  })).toEqual(["locale:vi", "theme:dark"]);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Hiểu thay đổi quan hệ/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("shell navigation exposes visible keyboard focus and active state", async ({ page }) => {
  await page.goto("/app");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const home = page.getByRole("link", { name: "Private Social Insights home" });
  await home.focus();
  await expect(home).toBeFocused();
  const analyzer = page.getByRole("link", { name: "Analyzer" });
  await analyzer.focus();
  await expect(analyzer).toBeFocused();
  await expect(analyzer).toHaveAttribute("aria-current", "page");
  const faq = page.getByRole("link", { name: "FAQ" });
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/faq$/);
});

test("shell has no horizontal overflow at supported responsive widths", async ({ page }) => {
  for (const width of [360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }
});

test("shell routes have no serious or critical accessibility violations", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route.path);
    const results = await createAxeBuilder(page).analyze();
    expect(
      results.violations.filter((violation) =>
        violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  }
});
