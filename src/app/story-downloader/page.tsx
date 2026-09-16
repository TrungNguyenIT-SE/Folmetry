import { RouteIntro } from "@/components/layout/route-intro";

export const metadata = { title: "Public Stories and Highlights" };

export default function StoryDownloaderPage() {
  return (
    <RouteIntro
      eyebrow="Separate network utility"
      title="View public Stories with a clear privacy boundary."
      description="When enabled, a public username will be sent to our server and configured data provider. Your relationship export is never part of that request."
    >
      <div className="notice notice--warning">
        Story lookup is not enabled yet. It will support public accounts only and will never ask for
        Instagram credentials.
      </div>
    </RouteIntro>
  );
}
