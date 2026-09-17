"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

export function ForgotPasswordForm() {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(form.get("email") ?? "").trim(),
      redirectTo: "/reset-password",
    });
    setPending(false);
    setComplete(true);
  };

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      <Field autoComplete="email" label={copy.common.email} name="email" required type="email" />
      {complete ? (
        <StatusRegion>{copy.forgot.complete}</StatusRegion>
      ) : null}
      <Button disabled={pending || complete} type="submit">{pending ? copy.forgot.pending : copy.forgot.submit}</Button>
      <div className="auth-links"><Link href="/login">{copy.forgot.back}</Link></div>
    </form>
  );
}
