import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <RouteIntro
      eyebrow="Terms"
      title="Use the service responsibly."
      description="Only analyze data you are authorized to use, and download public media only when you own it or have permission to save it. Final legal terms will be reviewed before release."
    />
  );
}
