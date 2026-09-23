import "server-only";

import { AssistantError, type AssistantProviderName } from "@/features/assistant/model";

type AssistantEnvironment = Readonly<Record<string, string | undefined>>;

export interface AssistantServerConfig {
  readonly providers: ReadonlyMap<AssistantProviderName, {
    readonly apiKey: string;
    readonly model: string;
  }>;
  readonly googleSearchEnabled: boolean;
}

function value(environment: AssistantEnvironment, key: string): string | undefined {
  const result = environment[key]?.trim();
  return result ? result : undefined;
}

function safeModel(valueToCheck: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/.test(valueToCheck);
}

export function readAssistantServerConfig(
  environment: AssistantEnvironment = process.env,
): AssistantServerConfig {
  if (
    environment["AI_ASSISTANT_ENABLED"] !== "true" ||
    environment["AI_PROVIDER_APPROVED"] !== "true"
  ) {
    throw new AssistantError("ASSISTANT_NOT_CONFIGURED");
  }

  const providers = new Map<AssistantProviderName, { apiKey: string; model: string }>();
  const groqKey = value(environment, "GROQ_API_KEY");
  const groqModel = value(environment, "GROQ_MODEL") ?? "openai/gpt-oss-20b";
  const googleKey = value(environment, "GOOGLE_AI_API_KEY");
  const googleModel = value(environment, "GOOGLE_AI_MODEL") ?? "gemini-3.8-flash";

  if (groqKey && safeModel(groqModel)) {
    providers.set("groq", { apiKey: groqKey, model: groqModel });
  }
  if (googleKey && safeModel(googleModel)) {
    providers.set("google", { apiKey: googleKey, model: googleModel });
  }
  if (providers.size === 0) throw new AssistantError("ASSISTANT_NOT_CONFIGURED");

  return {
    providers,
    googleSearchEnabled:
      environment["AI_GOOGLE_SEARCH_ENABLED"] === "true" && providers.has("google"),
  };
}
