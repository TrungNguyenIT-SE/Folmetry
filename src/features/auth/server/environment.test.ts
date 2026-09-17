import { describe, expect, it } from "vitest";

import { getAuthReadiness } from "@/features/auth/server/environment";

describe("getAuthReadiness", () => {
  it("reports every missing server-only dependency without values", () => {
    const readiness = getAuthReadiness({});
    expect(readiness).toEqual({
      authReady: false,
      mailReady: false,
      missing: [
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "SMTP_USER",
        "SMTP_PASSWORD",
      ],
    });
  });

  it("separates auth readiness from SMTP readiness", () => {
    const readiness = getAuthReadiness({
      DATABASE_URL: "postgresql://example.invalid/database",
      BETTER_AUTH_SECRET: "a-secure-secret-is-configured-outside-source",
      BETTER_AUTH_URL: "https://folmetry.example",
    });
    expect(readiness.authReady).toBe(true);
    expect(readiness.mailReady).toBe(false);
    expect(readiness.missing).toEqual(["SMTP_USER", "SMTP_PASSWORD"]);
  });
});
