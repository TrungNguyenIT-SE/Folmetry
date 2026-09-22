import type { Metadata } from "next";
import { headers } from "next/headers";
import { AccountOverview } from "@/features/auth/components";
import { auth } from "@/features/auth/server/auth";
import { requireUser } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Your account - Folmetry", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await requireUser("/account");
  const isAdmin = String(session.user.role ?? "user").split(",").includes("admin");
  let hasPassword = true;
  let providers: readonly string[] = ["credential"];
  try {
    const accounts = await auth.api.listUserAccounts({ headers: await headers() });
    hasPassword = accounts.some((account) => account.providerId === "credential");
    providers = [...new Set(accounts.map((account) => account.providerId))];
  } catch {
    // Fail closed: if account state cannot be verified, keep requiring the current password.
  }
  return <AccountOverview email={session.user.email} emailVerified={session.user.emailVerified} hasPassword={hasPassword} isAdmin={isAdmin} name={session.user.name} providers={providers} username={session.user.username ?? undefined} />;
}
