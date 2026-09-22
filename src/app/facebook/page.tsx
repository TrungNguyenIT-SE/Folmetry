import { FacebookHub } from "@/components/pages/platform-hub";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Facebook tools",
  description: "The dedicated Folmetry workspace for future validated Facebook export analysis.",
  path: "/facebook",
});

export default function FacebookPage() {
  return <FacebookHub />;
}
