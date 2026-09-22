import { HomeContent } from "@/components/pages/home-content";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Private Instagram relationship analysis",
  description: "Parse official Instagram follower exports locally, synchronize confirmed private snapshots across devices, and compare changes without sharing credentials.",
  path: "/",
});

export default function HomePage() {
  return <HomeContent />;
}
