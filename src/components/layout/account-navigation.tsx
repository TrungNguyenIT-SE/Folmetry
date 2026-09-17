"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

const subscribeToHydration = (): (() => void) => () => undefined;

export function AccountNavigation() {
  const router = useRouter();
  const { dictionary } = useI18n();
  const { data: session, isPending } = authClient.useSession();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  if (!hydrated || isPending) return <span aria-hidden="true" className="account-navigation__placeholder" />;
  if (session === null) {
    return (
      <div className="account-navigation">
        <Link href="/login">{dictionary.nav.signIn}</Link>
        <Link className="account-navigation__primary" href="/register">{dictionary.nav.register}</Link>
      </div>
    );
  }

  const isAdmin = String(session.user.role ?? "user").split(",").includes("admin");
  return (
    <div className="account-navigation">
      {isAdmin ? <Link href="/admin/users">{dictionary.nav.admin}</Link> : null}
      <Link href="/account">{dictionary.nav.account}</Link>
      <button
        onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => { router.push("/"); router.refresh(); } } })}
        type="button"
      >
        {dictionary.nav.signOut}
      </button>
    </div>
  );
}
