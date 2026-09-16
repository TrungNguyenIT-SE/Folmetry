import "server-only";

import type { PublicStoryProvider } from "../model";
import type { StoryServerConfig } from "./env";
import { InstagapiProvider } from "./providers/instagapi";

let provider: PublicStoryProvider | undefined;

export function getStoryProvider(config: StoryServerConfig): PublicStoryProvider {
  provider ??= new InstagapiProvider(config.apiKey, config.providerBaseUrl);
  return provider;
}

export function setStoryProviderForTests(value: PublicStoryProvider | undefined): void {
  provider = value;
}
