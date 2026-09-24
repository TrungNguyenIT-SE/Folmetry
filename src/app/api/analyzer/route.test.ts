import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  repositoryConstructor: vi.fn(),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  deleteAll: vi.fn(),
  assertSyncBodySize: vi.fn(),
}));

vi.mock("@/features/auth/server/session", () => ({
  getRequestSession: mocks.getRequestSession,
}));

vi.mock("@/features/analyzer/server/cloud-repository", () => ({
  MAX_SYNC_BODY_BYTES: 4 * 1024 * 1024,
  assertSyncBodySize: mocks.assertSyncBodySize,
  CloudAnalyzerRepository: class {
    listAccounts = mocks.listAccounts;
    createAccount = mocks.createAccount;
    deleteAll = mocks.deleteAll;

    constructor(ownerId: string) {
      mocks.repositoryConstructor(ownerId);
    }
  },
}));

import { DELETE, GET, POST } from "./route";

describe("analyzer synchronization route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.listAccounts.mockResolvedValue([]);
    mocks.createAccount.mockResolvedValue({
      id: "profile-1",
      platform: "instagram",
      label: "Personal",
      createdAt: 1,
      updatedAt: 1,
    });
  });

  it("rejects an unauthenticated account listing", async () => {
    mocks.getRequestSession.mockResolvedValue(null);
    const response = await GET(new Request("https://folmetry.test/api/analyzer?resource=accounts&platform=instagram"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.repositoryConstructor).not.toHaveBeenCalled();
  });

  it("derives repository ownership from the verified session", async () => {
    const response = await GET(new Request("https://folmetry.test/api/analyzer?resource=accounts&platform=facebook"));
    expect(response.status).toBe(200);
    expect(mocks.repositoryConstructor).toHaveBeenCalledWith("user-1");
    expect(mocks.listAccounts).toHaveBeenCalledOnce();
    expect(mocks.listAccounts).toHaveBeenCalledWith("facebook");
  });

  it("requires an explicit supported platform for account listings", async () => {
    const missing = await GET(new Request("https://folmetry.test/api/analyzer?resource=accounts"));
    const unknown = await GET(new Request("https://folmetry.test/api/analyzer?resource=accounts&platform=other"));
    expect(missing.status).toBe(503);
    expect(unknown.status).toBe(503);
    expect(mocks.listAccounts).not.toHaveBeenCalled();
  });

  it("deletes only the explicitly selected platform", async () => {
    const response = await DELETE(new Request("https://folmetry.test/api/analyzer", {
      method: "DELETE",
      headers: { "content-type": "application/json", origin: "https://folmetry.test" },
      body: JSON.stringify({ action: "deleteAll", platform: "facebook" }),
    }));
    expect(response.status).toBe(204);
    expect(mocks.deleteAll).toHaveBeenCalledWith("facebook");
  });

  it("does not accept a cross-origin analyzer mutation", async () => {
    const response = await POST(new Request("https://folmetry.test/api/analyzer", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.test" },
      body: JSON.stringify({
        action: "createAccount",
        input: { platform: "instagram", label: "Personal", ownerId: "attacker-choice" },
      }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("fails closed when an analyzer mutation omits Origin", async () => {
    const response = await POST(new Request("https://folmetry.test/api/analyzer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "createAccount", input: { platform: "instagram", label: "Personal" } }),
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("creates a profile for the session owner without consuming a client owner ID", async () => {
    const input = { platform: "instagram", label: "Personal" };
    const response = await POST(new Request("https://folmetry.test/api/analyzer", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://folmetry.test" },
      body: JSON.stringify({ action: "createAccount", input, ownerId: "ignored" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.repositoryConstructor).toHaveBeenCalledWith("user-1");
    expect(mocks.createAccount).toHaveBeenCalledWith(input);
  });
});
