import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export function createAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page });
}
