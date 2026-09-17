import { StoryDownloaderApp } from "@/features/story/components";
import { requireUser } from "@/features/auth/server/session";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Public Stories and Highlights", description: "Look up publicly available Instagram Stories and Highlights through a clearly disclosed, separate network utility.", path: "/story-downloader", index: false });

export default async function StoryDownloaderPage() {
  await requireUser("/story-downloader");
  return <StoryDownloaderApp />;
}
