import { EditorialContent } from "@/components/pages/editorial-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Privacy", description: "Understand local relationship-file processing, browser storage, deletion controls, hosting metadata, and the separate Story lookup boundary.", path: "/privacy" });

export default function PrivacyPage() {
  return <EditorialContent route="privacy" />;
}
