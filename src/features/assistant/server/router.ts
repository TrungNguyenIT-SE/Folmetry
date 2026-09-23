import "server-only";

import { createHash } from "node:crypto";

import type { AssistantProviderName, ResolvedAssistantMode } from "@/features/assistant/model";

import type { AssistantServerConfig } from "./config";
import {
  CloudflareAssistantProvider,
  GroqAssistantProvider,
  type AssistantProvider,
} from "./providers";

function affinity(seed: string): AssistantProviderName {
  return (createHash("sha256").update(seed).digest()[0] ?? 0) % 2 === 0 ? "groq" : "cloudflare";
}

export function providerCandidates(
  config: AssistantServerConfig,
  mode: ResolvedAssistantMode,
  conversationId: string,
  fetcher: typeof fetch = fetch,
): readonly AssistantProvider[] {
  const preferred = affinity(conversationId);
  const order: readonly AssistantProviderName[] = preferred === "groq"
    ? ["groq", "cloudflare"]
    : ["cloudflare", "groq"];

  return order.flatMap((name): AssistantProvider[] => {
    const provider = config.providers.get(name);
    if (provider === undefined) return [];
    if (provider.provider === "groq") {
      return [new GroqAssistantProvider(provider.model, provider.apiKey, fetcher)];
    }
    return [new CloudflareAssistantProvider(
      provider.model,
      provider.accountId,
      provider.apiToken,
      provider.gatewayId,
      fetcher,
    )];
  });
}
