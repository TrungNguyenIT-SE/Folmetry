import type { Metadata } from "next";

import { AuthShell, ResetPasswordForm } from "@/features/auth/components";

export const metadata: Metadata = { title: "Choose a new password - Folmetry", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const rawToken = params["token"];
  const token = typeof rawToken === "string" && rawToken.length > 0 ? rawToken : undefined;
  return (
    <AuthShell page="reset">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
