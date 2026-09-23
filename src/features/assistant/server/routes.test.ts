import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  readConfig: vi.fn(),
  providerCandidates: vi.fn(),
  repositoryConstructor: vi.fn(),
  listConversations: vi.fn(),
  beginTurn: vi.fn(),
  completeTurn: vi.fn(),
}));

vi.mock("@/features/auth/server/session", () => ({ getRequestSession: mocks.getRequestSession }));
vi.mock("./config", () => ({ readAssistantServerConfig: mocks.readConfig }));
vi.mock("./router", () => ({ providerCandidates: mocks.providerCandidates }));
vi.mock("./repository", () => ({
  AssistantRepository: class {
    listConversations = mocks.listConversations;
    beginTurn = mocks.beginTurn;
    completeTurn = mocks.completeTurn;
    constructor(ownerId: string) { mocks.repositoryConstructor(ownerId); }
  },
}));

import { handleAssistantGet, handleAssistantPost } from "./routes";

describe("assistant routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.listConversations.mockResolvedValue([]);
    mocks.readConfig.mockReturnValue({
      providers: new Map([["groq", { apiKey: "hidden", model: "model" }]]),
      googleSearchEnabled: false,
    });
    mocks.beginTurn.mockResolvedValue({
      conversationId: "conversation-1",
      userMessage: { id: "user-message", role: "user", content: "Hello", createdAt: 1, citations: [] },
      messages: [{ id: "user-message", role: "user", content: "Hello", createdAt: 1, citations: [] }],
    });
    mocks.completeTurn.mockResolvedValue(undefined);
  });

  it("requires an authenticated owner", async () => {
    mocks.getRequestSession.mockResolvedValue(null);
    const response = await handleAssistantGet(new Request("https://folmetry.test/api/assistant?resource=conversations"));
    expect(response.status).toBe(401);
    expect(mocks.repositoryConstructor).not.toHaveBeenCalled();
  });

  it("constructs the repository only from the authenticated session owner", async () => {
    const response = await handleAssistantGet(new Request("https://folmetry.test/api/assistant?resource=conversations"));
    expect(response.status).toBe(200);
    expect(mocks.repositoryConstructor).toHaveBeenCalledOnce();
    expect(mocks.repositoryConstructor).toHaveBeenCalledWith("user-1");
  });

  it("falls back before the first token and persists only the normalized answer", async () => {
    const failed = {
      name: "groq",
      model: "failed-model",
      grounded: false,
      async *stream() { throw new Error("upstream detail must not leak"); },
    };
    const working = {
      name: "google",
      model: "working-model",
      grounded: true,
      async *stream() {
        yield { type: "delta" as const, text: "Safe answer" };
        yield { type: "citations" as const, citations: [{ title: "Source", url: "https://example.com" }] };
      },
    };
    mocks.providerCandidates.mockReturnValue([failed, working]);
    const response = await handleAssistantPost(new Request("https://folmetry.test/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://folmetry.test" },
      body: JSON.stringify({ message: "Hello", mode: "general", locale: "en", pathname: "/" }),
    }));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"provider":"google"');
    expect(body).toContain('"text":"Safe answer"');
    expect(body).not.toContain("upstream detail");
    expect(mocks.completeTurn).toHaveBeenCalledWith(
      expect.any(String),
      "conversation-1",
      "Safe answer",
      "google",
      "working-model",
      [{ title: "Source", url: "https://example.com" }],
    );
  });

  it("rejects cross-origin chat mutations before reserving quota", async () => {
    const response = await handleAssistantPost(new Request("https://folmetry.test/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.test" },
      body: JSON.stringify({ message: "Hello", mode: "auto" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.beginTurn).not.toHaveBeenCalled();
  });

  it("rejects malformed conversation identifiers", async () => {
    const response = await handleAssistantPost(new Request("https://folmetry.test/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://folmetry.test" },
      body: JSON.stringify({ conversationId: "another-user-conversation", message: "Hello", mode: "auto" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.beginTurn).not.toHaveBeenCalled();
  });

  it("does not pretend to browse when Google Search grounding is disabled", async () => {
    const response = await handleAssistantPost(new Request("https://folmetry.test/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://folmetry.test" },
      body: JSON.stringify({ message: "What happened today?", mode: "web" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "ASSISTANT_NOT_CONFIGURED" });
    expect(mocks.beginTurn).not.toHaveBeenCalled();
  });
});
