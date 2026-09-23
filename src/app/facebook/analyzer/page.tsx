import { AnalyzerApp } from "@/features/analyzer/components";
import { requireUser } from "@/features/auth/server/session";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Facebook connection analyzer",
  description: "Parse an official Facebook Friends and Following JSON export locally, then synchronize confirmed snapshots privately.",
  path: "/facebook/analyzer",
  index: false,
});

export default async function FacebookAnalyzerPage() {
  await requireUser("/facebook/analyzer");
  return <AnalyzerApp platform="facebook" />;
}
