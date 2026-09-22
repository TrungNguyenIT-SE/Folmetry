// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppPreferencesProvider } from "@/i18n";

import { AccountOverview } from "./account-overview";

describe("AccountOverview", () => {
  it("shows every connected sign-in method without exposing provider secrets", () => {
    render(
      <AppPreferencesProvider>
        <AccountOverview
          email="member@example.invalid"
          emailVerified
          hasPassword
          isAdmin={false}
          name="Synthetic member"
          providers={["credential", "google"]}
        />
      </AppPreferencesProvider>,
    );

    const methods = screen.getByRole("list", { name: "Connected sign-in methods" });
    expect(methods.textContent).toContain("Email or username and password");
    expect(methods.textContent).toContain("Google");
    expect(methods.textContent).not.toContain("token");
  });
});
