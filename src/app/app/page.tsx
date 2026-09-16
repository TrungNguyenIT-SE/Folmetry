import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "Relationship analyzer" };

export default function AnalyzerPage() {
  return (
    <RouteIntro
      eyebrow="Local relationship analyzer"
      title="Your export stays on your device."
      description="The secure local import engine is ready; the guided analyzer workflow will be connected in the upcoming UX milestone."
    >
      <div className="notice" role="status">
        ZIP and JSON parsing runs locally in a dedicated worker. No file is uploaded and no Instagram credentials are required.
      </div>
    </RouteIntro>
  );
}
