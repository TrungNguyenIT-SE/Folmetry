import "server-only";

import type {
  AssistantCitation,
  AssistantMessage,
  AssistantProviderName,
  ResolvedAssistantMode,
} from "@/features/assistant/model";

export interface ProviderRequest {
  readonly messages: readonly AssistantMessage[];
  readonly systemPrompt: string;
  readonly mode: ResolvedAssistantMode;
  readonly signal: AbortSignal;
}

export type ProviderChunk =
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "citations"; readonly citations: readonly AssistantCitation[] };

export interface AssistantProvider {
  readonly name: AssistantProviderName;
  readonly model: string;
  readonly grounded: boolean;
  stream(request: ProviderRequest): AsyncGenerator<ProviderChunk>;
}
