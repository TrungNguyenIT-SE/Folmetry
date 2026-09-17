"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { authErrorMessage } from "@/features/auth/components/auth-error";
import { useI18n } from "@/i18n";

export function LoginForm({ returnTo }: Readonly<{ returnTo: Route }>) {
  const router = useRouter();
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") ?? "").trim();
    const credentials = { password: String(form.get("password") ?? ""), rememberMe: true, callbackURL: returnTo };
    const result = identifier.includes("@")
      ? await authClient.signIn.email({ ...credentials, email: identifier })
      : await authClient.signIn.username({ ...credentials, username: identifier });
    setPending(false);
    if (result.error !== null) {
      setError(authErrorMessage(result.error.code, copy.errors, copy.common.genericError));
      return;
    }
    router.push(returnTo);
    router.refresh();
  };

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      <Field autoCapitalize="none" autoComplete="username" label={copy.security.identifier} name="identifier" required spellCheck={false} />
      <Field autoComplete="current-password" label={copy.common.password} minLength={10} name="password" required type="password" />
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      <Button disabled={pending} type="submit">{pending ? copy.login.pending : copy.login.submit}</Button>
      <div className="auth-links">
        <Link href="/forgot-password">{copy.login.forgot}</Link>
        <Link href="/register">{copy.login.register}</Link>
      </div>
    </form>
  );
}
