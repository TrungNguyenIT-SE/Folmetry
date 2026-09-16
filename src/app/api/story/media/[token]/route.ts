import { handleStoryMedia } from "@/features/story/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { readonly params: Promise<{ readonly token: string }> }): Promise<Response> {
  const { token } = await context.params;
  return handleStoryMedia(request, token);
}
