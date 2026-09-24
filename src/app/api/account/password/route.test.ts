import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  listUserAccounts: vi.fn(),
  setPassword: vi.fn(),
}));

vi.mock("@/features/auth/server/session", () => ({
  getRequestSession: mocks.getRequestSession,
}));

vi.mock("@/features/auth/server/auth", () => ({
  auth: {
    api: {
      listUserAccounts: mocks.listUserAccounts,
      setPassword: mocks.setPassword,
    },
  },
}));

import { POST } from "./route";

function request(body: unknown, origin = "https://folmetry.test"): Request {
  return new Request("https://folmetry.test/api/account/password", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("first password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSession.mockResolvedValue({ user: { id: "google-user" } });
    mocks.listUserAccounts.mockResolvedValue([{ providerId: "google" }]);
    mocks.setPassword.mockResolvedValue({ status: true });
  });

  it("sets the first credential for an authenticated Google-only account", async () => {
    const response = await POST(request({ newPassword: "Strongpass1!" }));

    expect(response.status).toBe(200);
    expect(mocks.setPassword).toHaveBeenCalledWith(expect.objectContaining({
      body: { newPassword: "Strongpass1!" },
    }));
  });

  it("does not bypass current-password verification after a credential exists", async () => {
    mocks.listUserAccounts.mockResolvedValue([{ providerId: "google" }, { providerId: "credential" }]);

    const response = await POST(request({ newPassword: "Strongpass1!" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "PASSWORD_ALREADY_SET" });
    expect(mocks.setPassword).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated, cross-origin and weak-password requests", async () => {
    mocks.getRequestSession.mockResolvedValue(null);
    expect((await POST(request({ newPassword: "Strongpass1!" }))).status).toBe(401);

    expect((await POST(request({ newPassword: "Strongpass1!" }, "https://attacker.test"))).status).toBe(403);

    const missingOrigin = new Request("https://folmetry.test/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: "Strongpass1!" }),
    });
    expect((await POST(missingOrigin)).status).toBe(403);

    mocks.getRequestSession.mockResolvedValue({ user: { id: "google-user" } });
    expect((await POST(request({ newPassword: "weak" }))).status).toBe(400);
    expect(mocks.setPassword).not.toHaveBeenCalled();
  });

  it("marks password responses as private and non-cacheable", async () => {
    const response = await POST(request({ newPassword: "Strongpass1!" }));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
