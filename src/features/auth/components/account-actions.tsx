"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

export function AccountActions() {
  const router = useRouter();
  const { dictionary } = useI18n();
  const copy = dictionary.auth.account;
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  const revokeOthers = async (): Promise<void> => {
    setPending(true);
    const result = await authClient.revokeOtherSessions();
    setPending(false);
    setMessage(result.error === null ? copy.revoked : copy.revokeError);
  };
  const signOut = async (): Promise<void> => {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="stack-form">
      {message === undefined ? null : <StatusRegion>{message}</StatusRegion>}
      <div className="button-row">
        <Button disabled={pending} onClick={() => void revokeOthers()} type="button" variant="secondary">{copy.revoke}</Button>
        <Button disabled={pending} onClick={() => void signOut()} type="button">{copy.signOut}</Button>
      </div>
    </div>
  );
}
