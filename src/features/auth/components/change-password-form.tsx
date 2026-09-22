"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { authErrorMessage } from "@/features/auth/components/auth-error";
import { PasswordStrength } from "@/features/auth/components/password-strength";
import { isPasswordPolicySatisfied, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/features/auth/password-policy";
import { useI18n } from "@/i18n";

export function ChangePasswordForm({ hasPassword }: Readonly<{ hasPassword: boolean }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [passwordEstablished, setPasswordEstablished] = useState(hasPassword);
  const [complete, setComplete] = useState<"set" | "changed">();

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (!isPasswordPolicySatisfied(newPassword)) {
      setError(copy.security.passwordInvalid);
      return;
    }
    if (newPassword !== confirmation) {
      setError(copy.register.mismatch);
      return;
    }

    setPending(true);
    setError(undefined);
    setComplete(undefined);

    const result = passwordEstablished
      ? await authClient.changePassword({
          currentPassword: String(form.get("currentPassword") ?? ""),
          newPassword,
          revokeOtherSessions: true,
        })
      : await fetch("/api/account/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }).then(async (response) => {
          if (response.ok) return { error: null };
          const body = await response.json().catch(() => ({})) as { code?: string };
          return { error: { code: body.code } };
        }).catch(() => ({ error: { code: undefined } }));
    setPending(false);
    if (result.error !== null) {
      setError(authErrorMessage(result.error.code, copy.errors, copy.common.genericError));
      return;
    }
    formElement.reset();
    setNewPassword("");
    if (!passwordEstablished) {
      setPasswordEstablished(true);
      setComplete("set");
    } else {
      setComplete("changed");
    }
  };

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      {passwordEstablished
        ? <Field autoComplete="current-password" label={copy.security.currentPassword} name="currentPassword" required type="password" />
        : null}
      <Field
        autoComplete="new-password"
        label={copy.security.newPassword}
        maxLength={PASSWORD_MAX_LENGTH}
        minLength={PASSWORD_MIN_LENGTH}
        name="newPassword"
        onChange={(event) => setNewPassword(event.currentTarget.value)}
        required
        type="password"
        value={newPassword}
      />
      <PasswordStrength copy={copy.security.passwordStrength} password={newPassword} />
      <Field autoComplete="new-password" label={copy.security.confirmPassword} maxLength={PASSWORD_MAX_LENGTH} minLength={PASSWORD_MIN_LENGTH} name="passwordConfirmation" required type="password" />
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      {complete === undefined ? null : <StatusRegion>{complete === "set" ? copy.security.passwordSet : copy.security.passwordChanged}</StatusRegion>}
      <Button disabled={pending || !isPasswordPolicySatisfied(newPassword)} type="submit">
        {pending
          ? (passwordEstablished ? copy.security.changingPassword : copy.security.settingPassword)
          : (passwordEstablished ? copy.security.changePassword : copy.security.setPassword)}
      </Button>
    </form>
  );
}
