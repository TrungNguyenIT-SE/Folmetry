import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const baseURL = `http://127.0.0.1:${port}`;
const isCi = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    extraHTTPHeaders: { "x-folmetry-e2e-auth": "playwright-local-only" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: isCi ? "pnpm start" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
