import { describe, expect, it } from "vitest";

import { assistantSystemPrompt, resolveAssistantMode } from "./prompt";

describe("assistant intent and privacy prompt", () => {
  it("routes Folmetry, live, and general questions without another provider call", () => {
    expect(resolveAssistantMode("auto", "How do I export my Instagram followers?"))
      .toBe("folmetry");
    expect(resolveAssistantMode("auto", "Thời tiết hôm nay thế nào?"))
      .toBe("web");
    expect(resolveAssistantMode("auto", "Explain binary search"))
      .toBe("general");
    expect(resolveAssistantMode("general", "latest news")).toBe("general");
  });

  it("forbids claims of private relationship access", () => {
    const prompt = assistantSystemPrompt("folmetry", "vi", "/facebook/analyzer", false);
    expect(prompt).toContain("Never claim you inspected a user's ZIP");
    expect(prompt).toContain("/facebook/analyzer");
  });

  it("requires a freshness caveat when live grounding is unavailable", () => {
    expect(assistantSystemPrompt("web", "en", undefined, false))
      .toContain("current facts may be outdated");
    expect(assistantSystemPrompt("web", "en", undefined, true))
      .toContain("grounded web results");
  });
});
