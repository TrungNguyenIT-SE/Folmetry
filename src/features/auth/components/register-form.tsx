"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { authErrorMessage } from "@/features/auth/components/auth-error";
import { GoogleSignIn } from "@/features/auth/components/google-sign-in";
import { PasswordStrength } from "@/features/auth/components/password-strength";
import { isPasswordPolicySatisfied, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/features/auth/password-policy";
import { useI18n } from "@/i18n";

export function RegisterForm({ googleEnabled }: Readonly<{ googleEnabled: boolean }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (!isPasswordPolicySatisfied(password)) {
      setPending(false);
      setError(copy.security.passwordInvalid);
      return;
    }
    if (password !== confirmation) {
      setPending(false);
      setError(copy.register.mismatch);
      return;
    }
    const result = await authClient.signUp.email({
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      password,
      username: String(form.get("username") ?? "").trim(),
      callbackURL: "/app",
    });
    setPending(false);
    if (result.error !== null) {
      setError(authErrorMessage(result.error.code, copy.errors, copy.common.genericError));
      return;
    }
    setComplete(true);
  };

  if (complete) {
    return (
      <StatusRegion>
        {copy.register.complete}
      </StatusRegion>
    );
  }

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      {googleEnabled ? <GoogleSignIn callbackURL="/app" /> : null}
      <Field autoComplete="name" label={copy.register.name} maxLength={80} minLength={2} name="name" required />
      <Field autoCapitalize="none" autoComplete="username" description={copy.security.usernameHint} label={copy.security.username} maxLength={30} minLength={3} name="username" pattern="[A-Za-z0-9_.]+" required spellCheck={false} />
      <Field autoComplete="email" label={copy.common.email} name="email" required type="email" />
      <Field autoComplete="new-password" description={copy.register.passwordHint} label={copy.common.password} maxLength={PASSWORD_MAX_LENGTH} minLength={PASSWORD_MIN_LENGTH} name="password" onChange={(event) => setPassword(event.currentTarget.value)} required type="password" value={password} />
      <PasswordStrength copy={copy.security.passwordStrength} password={password} />
      <Field autoComplete="new-password" label={copy.register.confirm} maxLength={PASSWORD_MAX_LENGTH} minLength={PASSWORD_MIN_LENGTH} name="passwordConfirmation" required type="password" />
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      <Button disabled={pending || !isPasswordPolicySatisfied(password)} type="submit">{pending ? copy.register.pending : copy.register.submit}</Button>
      <div className="auth-links"><Link href="/login">{copy.register.existing}</Link></div>
    </form>
  );
}
