import { AnalyzerApp } from "@/features/analyzer/components";
import { requireUser } from "@/features/auth/server/session";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Instagram relationship analyzer", description: "Parse an official Instagram relationship ZIP locally, then securely synchronize confirmed snapshots across your devices.", path: "/app", index: false });

export default async function AnalyzerPage() {
  await requireUser("/app");
  return <AnalyzerApp />;
}
