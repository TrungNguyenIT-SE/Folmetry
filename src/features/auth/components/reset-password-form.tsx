"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { authErrorMessage } from "@/features/auth/components/auth-error";
import { isPasswordPolicySatisfied, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/features/auth/password-policy";
import { useI18n } from "@/i18n";

export function ResetPasswordForm({ token }: Readonly<{ token?: string }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (token === undefined) return;
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!isPasswordPolicySatisfied(password)) {
      setPending(false);
      setError(copy.security.passwordInvalid);
      return;
    }
    if (password !== String(form.get("passwordConfirmation") ?? "")) {
      setPending(false);
      setError(copy.register.mismatch);
      return;
    }
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error !== null) {
      setError(authErrorMessage(result.error.code, copy.errors, copy.common.genericError));
      return;
    }
    setComplete(true);
  };

  if (token === undefined) {
    return <StatusRegion assertive>{copy.reset.invalid}</StatusRegion>;
  }
  if (complete) {
    return <StatusRegion>{copy.reset.complete} <Link href="/login">{copy.reset.signIn}</Link></StatusRegion>;
  }
  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      <Field autoComplete="new-password" description={copy.register.passwordHint} label={copy.reset.password} maxLength={PASSWORD_MAX_LENGTH} minLength={PASSWORD_MIN_LENGTH} name="password" required type="password" />
      <Field autoComplete="new-password" label={copy.reset.confirm} maxLength={PASSWORD_MAX_LENGTH} minLength={PASSWORD_MIN_LENGTH} name="passwordConfirmation" required type="password" />
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      <Button disabled={pending} type="submit">{pending ? copy.reset.pending : copy.reset.submit}</Button>
    </form>
  );
}
