"use client";

import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { Badge, Card } from "@/components/ui";
import { AccountActions } from "@/features/auth/components/account-actions";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { useI18n } from "@/i18n";

export function AccountOverview({ name, email, username, emailVerified, isAdmin, hasPassword, providers }: Readonly<{ name: string; email: string; username?: string; emailVerified: boolean; isAdmin: boolean; hasPassword: boolean; providers: readonly string[] }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth.account;
  return (
    <PageTransition>
    <main className="auth-shell account-workspace" id="main-content">
      <div className="auth-shell__instrument" aria-hidden="true"><span>IDENTITY</span><i /><span>PRIVATE</span></div>
      <header className="auth-shell__heading"><span className="eyebrow">{copy.eyebrow}</span><h1>{name}</h1><p>{email}</p></header>
      <Card className="account-status-card" heading={copy.status}>
        <dl className="review-grid">
          <div><dt>{dictionary.auth.common.email}</dt><dd>{email}</dd></div>
          {username === undefined ? null : <div><dt>{dictionary.auth.security.username}</dt><dd>{username}</dd></div>}
          <div><dt>{copy.verification}</dt><dd><Badge tone={emailVerified ? "success" : "warning"}>{emailVerified ? copy.verified : copy.pending}</Badge></dd></div>
          <div><dt>{copy.role}</dt><dd><Badge tone={isAdmin ? "success" : "neutral"}>{isAdmin ? copy.admin : copy.user}</Badge></dd></div>
        </dl>
        {isAdmin ? <p><Link href="/admin/users">{copy.openAdmin}</Link></p> : null}
      </Card>
      <Card className="account-methods-card" heading={copy.methodsTitle}>
        <p>{copy.methodsBody}</p>
        <ul className="account-methods" aria-label={copy.methodsTitle}>
          {providers.map((provider) => (
            <li key={provider}>
              <span aria-hidden="true" className="account-methods__marker" />
              <strong>{provider === "google" ? copy.googleMethod : provider === "credential" ? copy.passwordMethod : provider}</strong>
              <Badge tone="success">{copy.connected}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="account-security-card" heading={dictionary.auth.security.title}>
        <p>{hasPassword ? dictionary.auth.security.body : dictionary.auth.security.firstPasswordBody}</p>
        <ChangePasswordForm hasPassword={hasPassword} />
      </Card>
      <Card className="account-sessions-card" heading={copy.sessionsTitle}>
        <p>{copy.sessionsBody}</p>
        <AccountActions />
      </Card>
      <Card className="account-sync-card" heading={copy.privacyTitle}><p>{copy.privacyBody}</p></Card>
    </main>
    </PageTransition>
  );
}
