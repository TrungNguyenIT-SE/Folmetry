"use client";

import type { Route } from "next";
import { useState } from "react";

import { Button, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

export function GoogleSignIn({ callbackURL }: Readonly<{ callbackURL: Route }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const signIn = async (): Promise<void> => {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (result.error === null) return;
    } catch {
      // Network and provider details are intentionally collapsed into safe UI copy.
    }
    setPending(false);
    setError(copy.common.genericError);
  };

  return (
    <div className="auth-social">
      <Button
        className="google-sign-in"
        disabled={pending}
        onClick={() => void signIn()}
        type="button"
        variant="secondary"
      >
        <svg aria-hidden="true" className="google-sign-in__icon" viewBox="0 0 24 24">
          <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" fill="#4285F4" />
          <path d="M12 22c2.7 0 4.97-.9 6.62-2.37l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" fill="#34A853" />
          <path d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z" fill="#FBBC05" />
          <path d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" fill="#EA4335" />
        </svg>
        <span>{pending ? copy.social.googlePending : copy.social.google}</span>
      </Button>
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      <div className="auth-divider"><span>{copy.social.divider}</span></div>
    </div>
  );
}
