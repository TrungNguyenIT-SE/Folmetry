import { EditorialContent } from "@/components/pages/editorial-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "How it works", description: "Learn how to request the correct JSON export, analyze it locally, review a snapshot, and compare later changes responsibly.", path: "/how-it-works" });

export default function HowItWorksPage() {
  return <EditorialContent route="howItWorks" />;
}
