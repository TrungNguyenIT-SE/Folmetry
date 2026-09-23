import { describe, expect, it } from "vitest";

import { AssistantError } from "@/features/assistant/model";

import { readAssistantServerConfig } from "./config";

describe("assistant server configuration", () => {
  it("fails closed until the feature and provider review are enabled", () => {
    expect(() => readAssistantServerConfig({ GROQ_API_KEY: "secret" })).toThrowError(
      expect.objectContaining<Partial<AssistantError>>({ code: "ASSISTANT_NOT_CONFIGURED" }),
    );
  });

  it("keeps provider keys server-side and enables Google grounding explicitly", () => {
    const config = readAssistantServerConfig({
      AI_ASSISTANT_ENABLED: "true",
      AI_PROVIDER_APPROVED: "true",
      AI_GOOGLE_SEARCH_ENABLED: "true",
      GROQ_API_KEY: "groq-secret",
      GROQ_MODEL: "openai/gpt-oss-20b",
      GOOGLE_AI_API_KEY: "google-secret",
      GOOGLE_AI_MODEL: "gemini-3.8-flash",
    });

    expect([...config.providers.keys()]).toEqual(["groq", "google"]);
    expect(config.googleSearchEnabled).toBe(true);
  });

  it("rejects unsafe model identifiers", () => {
    expect(() => readAssistantServerConfig({
      AI_ASSISTANT_ENABLED: "true",
      AI_PROVIDER_APPROVED: "true",
      GROQ_API_KEY: "secret",
      GROQ_MODEL: "../../unsafe?model=true",
    })).toThrowError(expect.objectContaining({ code: "ASSISTANT_NOT_CONFIGURED" }));
  });
});
