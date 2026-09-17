import type { Metadata } from "next";
import { AccountOverview } from "@/features/auth/components";
import { requireUser } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Your account - Folmetry", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await requireUser("/account");
  const isAdmin = String(session.user.role ?? "user").split(",").includes("admin");
  return <AccountOverview email={session.user.email} emailVerified={session.user.emailVerified} isAdmin={isAdmin} name={session.user.name} username={session.user.username ?? undefined} />;
}
