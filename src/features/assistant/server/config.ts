import "server-only";

import { AssistantError, type AssistantProviderName } from "@/features/assistant/model";

type AssistantEnvironment = Readonly<Record<string, string | undefined>>;

export interface AssistantServerConfig {
  readonly providers: ReadonlyMap<AssistantProviderName, AssistantProviderConfig>;
  readonly liveWebEnabled: boolean;
}

export type AssistantProviderConfig =
  | {
      readonly provider: "groq";
      readonly apiKey: string;
      readonly model: string;
    }
  | {
      readonly provider: "cloudflare";
      readonly accountId: string;
      readonly apiToken: string;
      readonly gatewayId: string;
      readonly model: string;
    };

function value(environment: AssistantEnvironment, key: string): string | undefined {
  const result = environment[key]?.trim();
  return result ? result : undefined;
}

function safeModel(valueToCheck: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/.test(valueToCheck);
}

function safeCloudflareModel(valueToCheck: string): boolean {
  return /^@cf\/[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9._-]{0,95}$/i.test(valueToCheck);
}

function safeCloudflareAccountId(valueToCheck: string): boolean {
  return /^[a-f0-9]{32}$/i.test(valueToCheck);
}

function safeGatewayId(valueToCheck: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(valueToCheck);
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

  const providers = new Map<AssistantProviderName, AssistantProviderConfig>();
  const groqKey = value(environment, "GROQ_API_KEY");
  const groqModel = value(environment, "GROQ_MODEL") ?? "openai/gpt-oss-20b";
  const cloudflareAccountId = value(environment, "CLOUDFLARE_ACCOUNT_ID");
  const cloudflareApiToken = value(environment, "CLOUDFLARE_AI_API_TOKEN");
  const cloudflareGatewayId = value(environment, "CLOUDFLARE_AI_GATEWAY_ID") ?? "default";
  const cloudflareModel = value(environment, "CLOUDFLARE_AI_MODEL") ?? "@cf/zai-org/glm-4.7-flash";

  if (groqKey && safeModel(groqModel)) {
    providers.set("groq", { provider: "groq", apiKey: groqKey, model: groqModel });
  }
  if (
    cloudflareAccountId &&
    cloudflareApiToken &&
    safeCloudflareAccountId(cloudflareAccountId) &&
    safeGatewayId(cloudflareGatewayId) &&
    safeCloudflareModel(cloudflareModel)
  ) {
    providers.set("cloudflare", {
      provider: "cloudflare",
      accountId: cloudflareAccountId,
      apiToken: cloudflareApiToken,
      gatewayId: cloudflareGatewayId,
      model: cloudflareModel,
    });
  }
  if (providers.size === 0) throw new AssistantError("ASSISTANT_NOT_CONFIGURED");

  return {
    providers,
    liveWebEnabled: false,
  };
}
