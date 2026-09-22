import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthSetupNotice, AuthShell, LoginForm } from "@/features/auth/components";
import { getAuthReadiness, isGoogleAuthReady } from "@/features/auth/server/environment";
import { getServerSession } from "@/features/auth/server/session";
import { safeReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: "Sign in - Folmetry", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params["next"]);
  const readiness = getAuthReadiness();
  const session = await getServerSession();
  if (session !== null) redirect(returnTo);

  return (
    <AuthShell page="login">
      {readiness.authReady ? <LoginForm googleEnabled={isGoogleAuthReady()} returnTo={returnTo} /> : <AuthSetupNotice missing={readiness.missing.filter((key) => !key.startsWith("SMTP_"))} />}
    </AuthShell>
  );
}
