// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordStrength } from "@/features/auth/components/password-strength";

const copy = {
  label: "Password strength",
  levels: ["Not set", "Very weak", "Weak", "Good", "Strong"] as const,
  minimumLength: "At least 10 characters",
  uppercase: "At least one uppercase letter",
  number: "At least one number",
  special: "At least one special character",
};

describe("PasswordStrength", () => {
  it("announces the score and exposes every password requirement", () => {
    render(<PasswordStrength copy={copy} password="Strongpass1!" />);

    const meter = screen.getByRole("progressbar", { name: "Password strength: Strong" });
    expect(meter.getAttribute("value")).toBe("4");
    expect(screen.getByText("At least 10 characters")).not.toBeNull();
    expect(screen.getByText("At least one uppercase letter")).not.toBeNull();
    expect(screen.getByText("At least one number")).not.toBeNull();
    expect(screen.getByText("At least one special character")).not.toBeNull();
  });
});
