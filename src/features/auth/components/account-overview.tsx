"use client";

import Link from "next/link";

import { Badge, Card } from "@/components/ui";
import { AccountActions } from "@/features/auth/components/account-actions";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { useI18n } from "@/i18n";

export function AccountOverview({ name, email, username, emailVerified, isAdmin }: Readonly<{ name: string; email: string; username?: string; emailVerified: boolean; isAdmin: boolean }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth.account;
  return (
    <div className="auth-shell">
      <header className="auth-shell__heading"><span className="eyebrow">{copy.eyebrow}</span><h1>{name}</h1><p>{email}</p></header>
      <Card heading={copy.status}>
        <dl className="review-grid">
          <div><dt>{dictionary.auth.common.email}</dt><dd>{email}</dd></div>
          {username === undefined ? null : <div><dt>{dictionary.auth.security.username}</dt><dd>{username}</dd></div>}
          <div><dt>{copy.verification}</dt><dd><Badge tone={emailVerified ? "success" : "warning"}>{emailVerified ? copy.verified : copy.pending}</Badge></dd></div>
          <div><dt>{copy.role}</dt><dd><Badge tone={isAdmin ? "success" : "neutral"}>{isAdmin ? copy.admin : copy.user}</Badge></dd></div>
        </dl>
        {isAdmin ? <p><Link href="/admin/users">{copy.openAdmin}</Link></p> : null}
        <AccountActions />
      </Card>
      <Card heading={dictionary.auth.security.title}>
        <p>{dictionary.auth.security.body}</p>
        <ChangePasswordForm />
      </Card>
      <Card heading={copy.privacyTitle}><p>{copy.privacyBody}</p></Card>
    </div>
  );
}
