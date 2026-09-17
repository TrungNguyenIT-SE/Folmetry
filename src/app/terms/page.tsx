import { EditorialContent } from "@/components/pages/editorial-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Terms", description: "Read the responsible-use, accuracy, copyright, public-media, availability, and independence terms for this service.", path: "/terms" });

export default function TermsPage() {
  return <EditorialContent route="terms" />;
}
