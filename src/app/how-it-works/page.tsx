import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <RouteIntro
      eyebrow="Simple and transparent"
      title="Official export in, private insights out."
      description="Download your JSON export from Meta, inspect the files locally, confirm the snapshot date, then compare it with an earlier snapshot saved in this browser."
    />
  );
}
