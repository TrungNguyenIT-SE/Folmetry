import { describe, expect, it, vi } from "vitest";

import type { AssistantServerConfig } from "./config";
import { providerCandidates } from "./router";

const config: AssistantServerConfig = {
  providers: new Map([
    ["groq", { provider: "groq", apiKey: "groq-secret", model: "groq-model" }],
    ["cloudflare", {
      provider: "cloudflare",
      accountId: "0123456789abcdef0123456789abcdef",
      apiToken: "cloudflare-secret",
      gatewayId: "default",
      model: "@cf/zai-org/glm-4.7-flash",
    }],
  ]),
  liveWebEnabled: false,
};

describe("assistant provider routing", () => {
  it("keeps ordinary conversation affinity deterministic", () => {
    const fetcher = vi.fn<typeof fetch>();
    const first = providerCandidates(config, "auto", "cdd10fc4-44d7-4ce2-8dcb-1cbce933fb08", fetcher);
    const second = providerCandidates(config, "auto", "cdd10fc4-44d7-4ce2-8dcb-1cbce933fb08", fetcher);
    expect(first.map((provider) => provider.name)).toEqual(second.map((provider) => provider.name));
    expect(new Set(first.map((provider) => provider.name))).toEqual(new Set(["groq", "cloudflare"]));
  });

  it("uses only Cloudflare when it is explicitly selected", () => {
    const candidates = providerCandidates(
      config,
      "cloudflare",
      "fba1cc52-421c-4c09-ad78-3b940cd02c26",
      vi.fn<typeof fetch>(),
    );
    expect(candidates.map((provider) => provider.name)).toEqual(["cloudflare"]);
    expect(candidates.every((provider) => !provider.grounded)).toBe(true);
  });
});
