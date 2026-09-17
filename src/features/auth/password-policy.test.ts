import { describe, expect, it } from "vitest";

import { evaluatePassword, isPasswordPolicySatisfied } from "@/features/auth/password-policy";

describe("password policy", () => {
  it("requires ten characters, an uppercase letter, a number and a special character", () => {
    expect(isPasswordPolicySatisfied("Short1!")).toBe(false);
    expect(isPasswordPolicySatisfied("lowercase1!")).toBe(false);
    expect(isPasswordPolicySatisfied("Uppercase!!")).toBe(false);
    expect(isPasswordPolicySatisfied("Uppercase12")).toBe(false);
    expect(isPasswordPolicySatisfied("Uppercase 12")).toBe(false);
    expect(isPasswordPolicySatisfied("Strongpass1!")).toBe(true);
  });

  it("reports a deterministic score for the strength indicator", () => {
    expect(evaluatePassword("weak").score).toBe(0);
    expect(evaluatePassword("Strongpass1!").score).toBe(4);
  });
});
