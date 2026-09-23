import "server-only";

import { createHash } from "node:crypto";

import type { AssistantProviderName, ResolvedAssistantMode } from "@/features/assistant/model";

import type { AssistantServerConfig } from "./config";
import {
  GoogleAssistantProvider,
  GroqAssistantProvider,
  type AssistantProvider,
} from "./providers";

function affinity(seed: string): AssistantProviderName {
  return (createHash("sha256").update(seed).digest()[0] ?? 0) % 2 === 0 ? "groq" : "google";
}

export function providerCandidates(
  config: AssistantServerConfig,
  mode: ResolvedAssistantMode,
  conversationId: string,
  fetcher: typeof fetch = fetch,
): readonly AssistantProvider[] {
  const preferred: AssistantProviderName = mode === "web" && config.providers.has("google")
    ? "google"
    : affinity(conversationId);
  const order: readonly AssistantProviderName[] = preferred === "groq"
    ? ["groq", "google"]
    : ["google", "groq"];

  return order.flatMap((name): AssistantProvider[] => {
    const provider = config.providers.get(name);
    if (provider === undefined) return [];
    return name === "groq"
      ? [new GroqAssistantProvider(provider.model, provider.apiKey, fetcher)]
      : [new GoogleAssistantProvider(
          provider.model,
          provider.apiKey,
          config.googleSearchEnabled && mode === "web",
          fetcher,
        )];
  });
}
