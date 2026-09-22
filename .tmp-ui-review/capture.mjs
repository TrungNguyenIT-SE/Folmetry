import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const home = await anonymous.newPage();
await home.goto("http://127.0.0.1:3000/");
await home.screenshot({ fullPage: true, path: ".tmp-ui-review/home-no-tailwind.png" });
await anonymous.close();

const authenticated = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  extraHTTPHeaders: { "x-folmetry-e2e-auth": "playwright-local-only:visual" },
});
const account = await authenticated.newPage();
await account.goto("http://127.0.0.1:3000/account");
await account.screenshot({ fullPage: true, path: ".tmp-ui-review/account-methods.png" });
await authenticated.close();
await browser.close();
