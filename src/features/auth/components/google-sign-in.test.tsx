// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { AppPreferencesProvider } from "@/i18n";

const mocks = vi.hoisted(() => ({
  social: vi.fn(),
}));

vi.mock("@/features/auth/client", () => ({
  authClient: { signIn: { social: mocks.social } },
}));

describe("GoogleSignIn", () => {
  it("starts the Better Auth Google flow with the safe callback", async () => {
    mocks.social.mockResolvedValue({ data: { redirect: true }, error: null });
    render(
      <AppPreferencesProvider>
        <GoogleSignIn callbackURL="/app" />
      </AppPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(mocks.social).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/app",
      });
    });
    expect((screen.getByRole("button", { name: "Connecting to Google…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
