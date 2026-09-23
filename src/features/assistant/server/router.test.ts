import { describe, expect, it, vi } from "vitest";

import type { AssistantServerConfig } from "./config";
import { providerCandidates } from "./router";

const config: AssistantServerConfig = {
  providers: new Map([
    ["groq", { apiKey: "groq-secret", model: "groq-model" }],
    ["google", { apiKey: "google-secret", model: "google-model" }],
  ]),
  googleSearchEnabled: true,
};

describe("assistant provider routing", () => {
  it("keeps ordinary conversation affinity deterministic", () => {
    const fetcher = vi.fn<typeof fetch>();
    const first = providerCandidates(config, "general", "cdd10fc4-44d7-4ce2-8dcb-1cbce933fb08", fetcher);
    const second = providerCandidates(config, "general", "cdd10fc4-44d7-4ce2-8dcb-1cbce933fb08", fetcher);
    expect(first.map((provider) => provider.name)).toEqual(second.map((provider) => provider.name));
    expect(new Set(first.map((provider) => provider.name))).toEqual(new Set(["groq", "google"]));
  });

  it("prefers grounded Google for explicit live web questions", () => {
    const candidates = providerCandidates(
      config,
      "web",
      "fba1cc52-421c-4c09-ad78-3b940cd02c26",
      vi.fn<typeof fetch>(),
    );
    expect(candidates[0]).toMatchObject({ name: "google", grounded: true });
    expect(candidates[1]).toMatchObject({ name: "groq", grounded: false });
  });
});
