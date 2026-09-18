import { AnalyzerApp } from "@/features/analyzer/components";
import { requireUser } from "@/features/auth/server/session";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Local relationship analyzer", description: "Import an official Instagram relationship ZIP, review it locally, and compare private snapshots stored in this browser.", path: "/app", index: false });

export default async function AnalyzerPage() {
  const session = await requireUser("/app");
  return <AnalyzerApp storageScope={session.user.id} />;
}
