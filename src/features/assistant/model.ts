export const ASSISTANT_MODES = ["auto", "folmetry", "general", "web"] as const;

export type AssistantMode = (typeof ASSISTANT_MODES)[number];
export type ResolvedAssistantMode = Exclude<AssistantMode, "auto">;
export type AssistantProviderName = "groq" | "google";

export interface AssistantCitation {
  readonly title: string;
  readonly url: string;
}

export interface AssistantMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: number;
  readonly provider?: AssistantProviderName;
  readonly model?: string;
  readonly citations: readonly AssistantCitation[];
}

export interface AssistantConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly mode: AssistantMode;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly preview: string;
}

export interface AssistantConversation extends AssistantConversationSummary {
  readonly messages: readonly AssistantMessage[];
}

export type AssistantStreamEvent =
  | {
      readonly type: "meta";
      readonly conversationId: string;
      readonly messageId: string;
      readonly mode: ResolvedAssistantMode;
      readonly provider: AssistantProviderName;
      readonly model: string;
      readonly grounded: boolean;
    }
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "citations"; readonly citations: readonly AssistantCitation[] }
  | { readonly type: "done" }
  | {
      readonly type: "error";
      readonly code: AssistantErrorCode;
      readonly requestId: string;
      readonly retryAfterSeconds?: number;
    };

export const ASSISTANT_ERROR_CODES = [
  "ASSISTANT_INVALID_REQUEST",
  "ASSISTANT_NOT_CONFIGURED",
  "ASSISTANT_RATE_LIMITED",
  "ASSISTANT_CONVERSATION_NOT_FOUND",
  "ASSISTANT_PROVIDER_UNAVAILABLE",
] as const;

export type AssistantErrorCode = (typeof ASSISTANT_ERROR_CODES)[number];

const statusByCode: Readonly<Record<AssistantErrorCode, number>> = {
  ASSISTANT_INVALID_REQUEST: 400,
  ASSISTANT_NOT_CONFIGURED: 503,
  ASSISTANT_RATE_LIMITED: 429,
  ASSISTANT_CONVERSATION_NOT_FOUND: 404,
  ASSISTANT_PROVIDER_UNAVAILABLE: 503,
};

export class AssistantError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    readonly code: AssistantErrorCode,
    options: { readonly cause?: unknown; readonly retryAfterSeconds?: number } = {},
  ) {
    super(code, { cause: options.cause });
    this.name = "AssistantError";
    this.status = statusByCode[code];
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isAssistantMode(value: unknown): value is AssistantMode {
  return typeof value === "string" && (ASSISTANT_MODES as readonly string[]).includes(value);
}
