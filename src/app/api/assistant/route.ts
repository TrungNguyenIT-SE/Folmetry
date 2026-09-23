import {
  handleAssistantDelete,
  handleAssistantGet,
  handleAssistantPost,
} from "@/features/assistant/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleAssistantGet;
export const POST = handleAssistantPost;
export const DELETE = handleAssistantDelete;
