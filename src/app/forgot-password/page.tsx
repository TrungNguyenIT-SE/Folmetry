import type { Metadata } from "next";

import { AuthSetupNotice, AuthShell, ForgotPasswordForm } from "@/features/auth/components";
import { getAuthReadiness } from "@/features/auth/server/environment";

export const metadata: Metadata = { title: "Forgot password - Folmetry", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  const readiness = getAuthReadiness();
  return (
    <AuthShell page="forgot">
      {readiness.authReady && readiness.mailReady ? <ForgotPasswordForm /> : <AuthSetupNotice missing={readiness.missing} />}
    </AuthShell>
  );
}
