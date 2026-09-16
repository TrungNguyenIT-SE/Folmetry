import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <RouteIntro
      eyebrow="Privacy"
      title="Two features, two explicit data boundaries."
      description="Relationship exports remain local. A Story lookup, when enabled, sends only the submitted public handle through our server to the configured provider."
    />
  );
}
