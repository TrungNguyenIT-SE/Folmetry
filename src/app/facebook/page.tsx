import { FacebookHub } from "@/components/pages/platform-hub";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Facebook tools",
  description: "Analyze official Facebook Friends and Following JSON exports locally and synchronize confirmed connection snapshots privately.",
  path: "/facebook",
});

export default function FacebookPage() {
  return <FacebookHub />;
}
