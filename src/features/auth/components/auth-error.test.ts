import { describe, expect, it } from "vitest";

import { authErrorMessage } from "@/features/auth/components/auth-error";

const messages = {
  emailNotVerified: "verify",
  invalidCredentials: "invalid",
  existingUser: "existing",
  banned: "banned",
  rateLimited: "limited",
  invalidPassword: "invalid password",
  passwordPolicy: "password policy",
  usernameTaken: "username taken",
};

describe("authErrorMessage", () => {
  it("maps expected account states and hides unknown server details", () => {
    expect(authErrorMessage("EMAIL_NOT_VERIFIED", messages, "fallback")).toBe("verify");
    expect(authErrorMessage("INVALID_USERNAME_OR_PASSWORD", messages, "fallback")).toBe("invalid");
    expect(authErrorMessage("DATABASE_CONNECTION_STRING_WITH_SECRET", messages, "fallback")).toBe("fallback");
  });
});
