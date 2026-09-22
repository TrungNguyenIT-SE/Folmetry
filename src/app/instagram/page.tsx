import { InstagramHub } from "@/components/pages/platform-hub";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Instagram tools",
  description: "Instagram relationship analysis and public Story tools in one clearly separated workspace.",
  path: "/instagram",
});

export default function InstagramPage() {
  return <InstagramHub />;
}
