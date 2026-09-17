import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthSetupNotice, AuthShell, RegisterForm } from "@/features/auth/components";
import { getAuthReadiness } from "@/features/auth/server/environment";
import { getServerSession } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Create account - Folmetry", robots: { index: false, follow: false } };

export default async function RegisterPage() {
  const readiness = getAuthReadiness();
  if (await getServerSession()) redirect("/app");
  return (
    <AuthShell page="register">
      {readiness.authReady && readiness.mailReady ? <RegisterForm /> : <AuthSetupNotice missing={readiness.missing} />}
    </AuthShell>
  );
}
