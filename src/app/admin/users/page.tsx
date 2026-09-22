import type { Metadata } from "next";
import { headers } from "next/headers";

import { PageTransition } from "@/components/layout/page-transition";
import { AdminHeading, AdminUserManager } from "@/features/auth/components";
import { auth } from "@/features/auth/server/auth";
import { requireAdmin } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "User administration - Folmetry", robots: { index: false, follow: false } };

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const result = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 50, offset: 0, sortBy: "createdAt", sortDirection: "desc" },
  });
  return (
    <PageTransition>
    <main className="auth-shell auth-shell--wide" id="main-content">
      <AdminHeading />
      <AdminUserManager currentUserId={session.user.id} initialTotal={result.total} initialUsers={result.users} />
    </main>
    </PageTransition>
  );
}
