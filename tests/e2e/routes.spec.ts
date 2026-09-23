import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAxeBuilder } from "../helpers/axe";

const instagramFixtures = fileURLToPath(new URL("../fixtures/instagram", import.meta.url));

const routes = [
  { path: "/", heading: /Understand relationship changes/ },
  { path: "/instagram", heading: /Instagram tools/ },
  { path: "/facebook", heading: /Facebook connections, tracked from your official export/ },
  { path: "/app", heading: /One relationship history across your devices/ },
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

test("protected tools require a real website session", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: {} });
  try {
    const page = await context.newPage();
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.goto("/facebook/analyzer");
    await expect(page).toHaveURL(/\/login\?next=%2Ffacebook%2Fanalyzer$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    const response = await context.request.post("/api/story/lookup", {
      data: { handle: "public.test" },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHORIZED" });

    const analyzerResponse = await context.request.get("/api/analyzer?resource=accounts");
    expect(analyzerResponse.status()).toBe(401);
    expect(await analyzerResponse.json()).toMatchObject({ code: "UNAUTHORIZED" });
  } finally {
    await context.close();
  }
});

test("configured Google sign-in starts the official OAuth flow", async ({ browser }) => {
  test.skip(
    !process.env["GOOGLE_CLIENT_ID"] || !process.env["GOOGLE_CLIENT_SECRET"],
    "Google OAuth credentials are intentionally optional.",
  );
  const context = await browser.newContext({ extraHTTPHeaders: {} });
  try {
    const page = await context.newPage();
    await page.route("https://accounts.google.com/**", async (route) => {
      await route.fulfill({ contentType: "text/html", body: "<h1>Google OAuth intercepted</h1>" });
    });
    await page.goto("/login?next=%2Fapp");
    expect(await page.content()).not.toContain(process.env["GOOGLE_CLIENT_SECRET"]);
    const googleRequest = page.waitForRequest((request) =>
      request.url().startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
    );
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const authorizationUrl = new URL((await googleRequest).url());

    expect(authorizationUrl.searchParams.get("client_id")).toBe(process.env["GOOGLE_CLIENT_ID"]);
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:3000/api/auth/callback/google",
    );
    expect(authorizationUrl.searchParams.get("scope")?.split(" ")).toEqual(
      expect.arrayContaining(["openid", "email", "profile"]),
    );
  } finally {
    await context.close();
  }
});

test("synchronized analyzer data is isolated between website accounts", async ({ browser }) => {
  test.skip(!process.env["DATABASE_URL"], "Analyzer synchronization requires PostgreSQL.");
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-folmetry-e2e-auth": "playwright-local-only:admin" },
  });
  try {
    const page = await context.newPage();
    await page.goto("/app");
    await page.getByLabel("Profile label").fill("Admin private archive");
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByLabel("Select profile")).toContainText("Admin private archive");

    await context.setExtraHTTPHeaders({
      "x-folmetry-e2e-auth": "playwright-local-only:regular-user",
    });
    await page.goto("/app");
    await expect(page.getByText("No Instagram profiles yet.")).toBeVisible();
    await expect(page.getByText("Admin private archive")).toHaveCount(0);

    await context.setExtraHTTPHeaders({
      "x-folmetry-e2e-auth": "playwright-local-only:admin",
    });
    await page.goto("/app");
    await expect(page.getByLabel("Select profile")).toContainText("Admin private archive");
  } finally {
    await context.close();
  }
});

test("public metadata endpoints and page SEO are available", async ({ page, request }) => {
  const expectedTitles = new Set<string>();
  for (const route of routes) {
    await page.goto(route.path);
    const title = await page.title();
    expect(title).toContain("Folmetry");
    expect(expectedTitles.has(title)).toBe(false);
    expectedTitles.add(title);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical ?? "", page.url()).pathname).toBe(route.path);
  }

  for (const asset of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/opengraph-image"]) {
    const response = await request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
  const iconHref = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(iconHref).toBeTruthy();
  expect((await request.get(new URL(iconHref ?? "", page.url()).toString())).ok()).toBe(true);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/api/");
});

test("FAQ exposes fifteen accessible questions and valid structured data", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.locator(".faq-list details")).toHaveCount(15);
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = schema.map((value) => JSON.parse(value) as { "@type"?: string; mainEntity?: unknown[] }).find((value) => value["@type"] === "FAQPage");
  expect(faq?.mainEntity).toHaveLength(15);
});

test("Story utility discloses its boundary and remains safely disabled without approval", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") {
      externalRequests.push(url.href);
    }
  });

  await page.goto("/story-downloader");
  await expect(page.getByText("Before you continue", { exact: false })).toBeVisible();
  await page.getByLabel("Public Instagram handle").fill("public.test");
  await expect(page.getByLabel("Public Instagram handle")).toHaveValue("public.test");
  await page.getByRole("button", { name: "View public Stories" }).click();
  await expect(page.getByText("not enabled", { exact: false })).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test("Story and Highlight UI uses only same-origin routes and does not persist lookup state", async ({ page }) => {
  const traffic: string[] = [];
  page.on("request", (request) => traffic.push(request.url()));
  await page.route("**/api/story/lookup", async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ok: true, data: {
      handle: "public.test", fetchedAt: "2026-09-16T00:00:00.000Z",
      stories: [{ id: "story-1", mediaType: "image", previewRef: "opaque-story-preview", downloadRef: "opaque-story-download" }],
      highlights: [{ id: "opaque-highlight", title: "Summer", itemCount: 1 }],
    } }),
  }));
  await page.route("**/api/story/highlight-items", async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ok: true, data: [{ id: "highlight-item-1", mediaType: "image", previewRef: "opaque-highlight-preview", downloadRef: "opaque-highlight-download" }] }),
  }));
  await page.route("**/api/story/media/**", async (route) => route.fulfill({ contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64") }));

  await page.goto("/story-downloader");
  await page.getByLabel("Public Instagram handle").fill("@Public.Test");
  await page.getByRole("button", { name: "View public Stories" }).click();
  await expect(page.getByRole("heading", { name: "@public.test" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download media" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Highlights" }).click();
  await page.getByRole("button", { name: /Summer/ }).click();
  await expect(page.getByRole("link", { name: "Download media" })).toHaveCount(1);
  expect(traffic.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(true);

  await page.reload();
  await expect(page.getByLabel("Public Instagram handle")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "@public.test" })).toHaveCount(0);
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
  const menuTrigger = page.getByRole("button", { name: "Open navigation menu" });
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  await page.getByRole("button", { name: "VI", exact: true }).click();
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
  const home = page.getByRole("link", { name: "Folmetry home" });
  await home.focus();
  await expect(home).toBeFocused();
  const menuTrigger = page.getByRole("button", { name: "Open navigation menu" });
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  const instagram = page.getByRole("link", { name: "Instagram", exact: true });
  await instagram.focus();
  await expect(instagram).toBeFocused();
  await expect(instagram).toHaveAttribute("aria-current", "page");
  const faq = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "FAQ" });
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/faq$/);
});

test("shell has no horizontal overflow at supported responsive widths", async ({ page }) => {
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width <= 752) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
    }
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }
});

test("platform navigation preserves deep links and browser history", async ({ page }) => {
  await page.goto("/instagram");
  const menuTrigger = page.getByRole("button", { name: "Open navigation menu" });
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  await expect(page.getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute("aria-current", "page");
  if (await menuTrigger.isVisible()) await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Open analyzer", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/instagram$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/facebook");
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  await expect(page.getByRole("link", { name: "Facebook", exact: true })).toHaveAttribute("aria-current", "page");
});

test("mobile navigation traps focus, closes with Escape, and restores its trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Instagram", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Vietnamese dark mode reflows at 320px and remains accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("button", { name: "VI", exact: true }).click();
  await page.getByRole("combobox", { name: "Giao diện" }).selectOption("dark");
  await page.locator(".site-menu-button").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  const results = await createAxeBuilder(page).analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});

test("shell survives 200 percent text sizing and forced colors", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Forced-colors emulation is verified in Chromium.");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.getByRole("link", { name: "Instagram", exact: true })).toBeVisible();
});

test("signature motion is removed when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const orbit = page.locator(".signal-field__orbit").first();
  await expect(orbit).toBeVisible();
  expect(await orbit.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  const sweep = page.locator(".signal-field__sweep").first();
  expect(await sweep.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

  const primaryAction = page.getByRole("link", { name: "Open analyzer" }).first();
  await primaryAction.hover({ force: true });
  expect(await primaryAction.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("save-data disables ambient signal motion", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, addEventListener() {}, removeEventListener() {} },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-save-data", "true");
  const sweep = page.locator(".signal-field__sweep").first();
  expect(await sweep.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("landing reserves layout and stays within the CLS laboratory budget", async ({ page }) => {
  await page.addInitScript(() => {
    let cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { readonly hadRecentInput: boolean; readonly value: number };
        if (!shift.hadRecentInput) cumulativeLayoutShift += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    Object.defineProperty(window, "__folmetryCls", { get: () => cumulativeLayoutShift });
  });
  await page.goto("/");
  await page.locator(".signal-field").waitFor();
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as unknown as { readonly __folmetryCls: number }).__folmetryCls);
  expect(cls).toBeLessThanOrEqual(0.1);
});

test("shell routes have no serious or critical accessibility violations", async ({ page }) => {
  test.setTimeout(60_000);
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

test("analyzer completes two local imports, persists history, isolates accounts, and exports CSV", async ({ page }) => {
  test.skip(!process.env["DATABASE_URL"], "Analyzer synchronization requires PostgreSQL.");
  test.slow();
  await page.goto("/app");
  await expect(page.getByRole("navigation", { name: "Analyzer workflow" }).locator('[aria-current="step"]')).toContainText("Instagram profile");
  await page.getByLabel("Profile label").fill("Personal archive");
  await page.getByLabel("Instagram username (optional)").fill("private.local");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByRole("heading", { name: "Import an Instagram relationship export" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Analyzer workflow" }).locator('[aria-current="step"]')).toContainText("Import");

  const manualInput = page.locator('input[accept^=".json"]');
  await manualInput.setInputFiles([
    path.join(instagramFixtures, "fixture-a", "followers_1.json"),
    path.join(instagramFixtures, "fixture-a", "following.json"),
  ]);
  await expect(page.getByRole("heading", { name: "Review import" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Analyzer workflow" }).locator('[aria-current="step"]')).toContainText("Review");
  await page.getByLabel("Snapshot date").fill("2026-01-01T10:00");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await expect(page.getByRole("heading", { name: "Relationship results" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Analyzer workflow" }).locator('[aria-current="step"]')).toContainText("Insights");
  await expect(page.getByText("This is the first snapshot", { exact: false })).toBeVisible();
  const resultGeometry = await page.evaluate(() => {
    const tabList = document.querySelector<HTMLElement>(".results-card [role='tablist']")?.getBoundingClientRect();
    const firstMetric = document.querySelector<HTMLElement>(".results-card .summary-card")?.getBoundingClientRect();
    return tabList === undefined || firstMetric === undefined
      ? undefined
      : { tabBottom: tabList.bottom, metricTop: firstMetric.top };
  });
  expect(resultGeometry).toBeDefined();
  expect(resultGeometry!.metricTop - resultGeometry!.tabBottom).toBeGreaterThanOrEqual(12);

  await manualInput.setInputFiles([
    path.join(instagramFixtures, "fixture-b", "followers_1.json"),
    path.join(instagramFixtures, "fixture-b", "following.json"),
  ]);
  await expect(page.getByRole("heading", { name: "Review import" })).toBeVisible();
  await page.getByLabel("Snapshot date").fill("2026-02-01T10:00");
  await page.getByRole("button", { name: "Save snapshot" }).click();

  const lostFollowersTab = page.getByRole("tab", { name: "Lost followers" });
  await lostFollowersTab.click();
  await expect(lostFollowersTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("@bravo_test")).toBeVisible();
  await lostFollowersTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "New followers" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("@echo.test")).toBeVisible();

  const resultDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(resultDimensions.scrollWidth).toBeLessThanOrEqual(resultDimensions.clientWidth);

  await page.getByRole("tab", { name: "Overview" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^relationship-insights-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(download.suggestedFilename()).not.toContain("private.local");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Relationship results" })).toBeVisible();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.locator(".snapshot-list li")).toHaveCount(2);
  await page.getByRole("button", { name: "Compare snapshots" }).click();
  await expect(page.getByText("Comparison range", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Create another Instagram profile" }).click();
  await page.getByLabel("Profile label").fill("Work archive");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByRole("heading", { name: "Relationship results" })).toHaveCount(0);
  await page.getByLabel("Select profile").selectOption({ label: "Personal archive (@private.local)" });
  await expect(page.getByRole("heading", { name: "Relationship results" })).toBeVisible();
});

test("analyzer first-use layout has no horizontal overflow at supported widths", async ({ page }) => {
  for (const width of [360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByLabel("Profile label")).toBeVisible();
  }
});

test("analyzer content and footer keep separate responsive layout regions", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app");
    await expect(page.getByLabel("Profile label")).toBeVisible();
    const layout = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>(".page-shell--analyzer")?.getBoundingClientRect();
      const heading = document.querySelector<HTMLElement>(".analyzer-heading")?.getBoundingClientRect();
      const card = document.querySelector<HTMLElement>(".analyzer-app > .card")?.getBoundingClientRect();
      const summary = document.querySelector<HTMLElement>(".site-footer__summary")?.getBoundingClientRect();
      const navigation = document.querySelector<HTMLElement>(".site-footer nav")?.getBoundingClientRect();
      const overlaps = summary && navigation
        ? summary.left < navigation.right && summary.right > navigation.left && summary.top < navigation.bottom && summary.bottom > navigation.top
        : true;
      return {
        mainLeft: main?.left ?? -1,
        mainRight: main?.right ?? Number.POSITIVE_INFINITY,
        headingBottom: heading?.bottom ?? Number.POSITIVE_INFINITY,
        cardTop: card?.top ?? -1,
        footerOverlaps: overlaps,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    expect(layout.mainLeft).toBeGreaterThanOrEqual(16);
    expect(layout.mainRight).toBeLessThanOrEqual(layout.viewportWidth - 16);
    expect(layout.headingBottom).toBeLessThan(layout.cardTop);
    expect(layout.footerOverlaps).toBe(false);
  }
});
