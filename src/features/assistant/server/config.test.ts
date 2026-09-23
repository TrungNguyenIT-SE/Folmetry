import { describe, expect, it } from "vitest";

import { AssistantError } from "@/features/assistant/model";

import { readAssistantServerConfig } from "./config";

describe("assistant server configuration", () => {
  it("fails closed until the feature and provider review are enabled", () => {
    expect(() => readAssistantServerConfig({ GROQ_API_KEY: "secret" })).toThrowError(
      expect.objectContaining<Partial<AssistantError>>({ code: "ASSISTANT_NOT_CONFIGURED" }),
    );
  });

  it("keeps Groq and Cloudflare credentials server-side", () => {
    const config = readAssistantServerConfig({
      AI_ASSISTANT_ENABLED: "true",
      AI_PROVIDER_APPROVED: "true",
      GROQ_API_KEY: "groq-secret",
      GROQ_MODEL: "openai/gpt-oss-20b",
      CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      CLOUDFLARE_AI_API_TOKEN: "cloudflare-secret",
      CLOUDFLARE_AI_GATEWAY_ID: "folmetry",
      CLOUDFLARE_AI_MODEL: "@cf/zai-org/glm-4.7-flash",
    });

    expect([...config.providers.keys()]).toEqual(["groq", "cloudflare"]);
    expect(config.providers.get("cloudflare")).toMatchObject({
      accountId: "0123456789abcdef0123456789abcdef",
      gatewayId: "folmetry",
      model: "@cf/zai-org/glm-4.7-flash",
    });
    expect(config.liveWebEnabled).toBe(false);
  });

  it("rejects unsafe model identifiers", () => {
    expect(() => readAssistantServerConfig({
      AI_ASSISTANT_ENABLED: "true",
      AI_PROVIDER_APPROVED: "true",
      GROQ_API_KEY: "secret",
      GROQ_MODEL: "../../unsafe?model=true",
    })).toThrowError(expect.objectContaining({ code: "ASSISTANT_NOT_CONFIGURED" }));
  });

  it("requires a valid Cloudflare account ID and @cf model", () => {
    expect(() => readAssistantServerConfig({
      AI_ASSISTANT_ENABLED: "true",
      AI_PROVIDER_APPROVED: "true",
      CLOUDFLARE_ACCOUNT_ID: "not-an-account",
      CLOUDFLARE_AI_API_TOKEN: "secret",
      CLOUDFLARE_AI_MODEL: "glm-4.7-flash",
    })).toThrowError(expect.objectContaining({ code: "ASSISTANT_NOT_CONFIGURED" }));
  });
});
