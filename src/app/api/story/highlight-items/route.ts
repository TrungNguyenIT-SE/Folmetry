import { handleHighlightItems } from "@/features/story/server/routes";
import { requireApiUser } from "@/features/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireApiUser(request);
  if (unauthorized !== undefined) return unauthorized;
  return handleHighlightItems(request);
}
