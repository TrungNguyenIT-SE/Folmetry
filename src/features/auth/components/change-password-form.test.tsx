// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { AppPreferencesProvider } from "@/i18n";

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
}));

vi.mock("@/features/auth/client", () => ({
  authClient: { changePassword: mocks.changePassword },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillNewPassword(): void {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Strongpass1!" } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Strongpass1!" } });
}

describe("ChangePasswordForm", () => {
  it("lets a Google-only account set its first password without a current password", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AppPreferencesProvider><ChangePasswordForm hasPassword={false} /></AppPreferencesProvider>);

    expect(screen.queryByLabelText("Current password")).toBeNull();
    fillNewPassword();
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/account/password", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Password set. You can now also sign in with your email and password.")).not.toBeNull();
    expect(screen.getByLabelText("Current password")).not.toBeNull();
  });

  it("still requires and verifies the current password for an existing credential", async () => {
    mocks.changePassword.mockResolvedValue({ error: null });
    render(<AppPreferencesProvider><ChangePasswordForm hasPassword /></AppPreferencesProvider>);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Oldpass1!xx" } });
    fillNewPassword();
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "Oldpass1!xx",
      newPassword: "Strongpass1!",
      revokeOtherSessions: true,
    }));
  });
});
