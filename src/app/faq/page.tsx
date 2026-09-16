import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <RouteIntro
      eyebrow="FAQ"
      title="What the product can—and cannot—do."
      description="It can compare official relationship exports locally. It cannot reveal private accounts, prove why someone disappeared from a snapshot, or bypass Instagram access controls."
    />
  );
}
