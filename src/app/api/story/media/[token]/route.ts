import { handleStoryMedia } from "@/features/story/server/routes";
import { requireApiUser } from "@/features/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { readonly params: Promise<{ readonly token: string }> }): Promise<Response> {
  const unauthorized = await requireApiUser(request);
  if (unauthorized !== undefined) return unauthorized;
  const { token } = await context.params;
  return handleStoryMedia(request, token);
}
