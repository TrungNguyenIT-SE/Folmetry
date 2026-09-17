import { HomeContent } from "@/components/pages/home-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Private Instagram relationship analysis",
  description: "Analyze official Instagram follower exports locally, save private snapshots in your browser, and compare changes without sharing credentials.",
  path: "/",
});

export default function HomePage() {
  return <HomeContent />;
}
