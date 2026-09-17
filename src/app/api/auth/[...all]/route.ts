import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/features/auth/server/auth";
import { isAuthReady } from "@/features/auth/server/environment";

const handlers = toNextJsHandler(auth);

function unavailable(): Response {
  return Response.json(
    { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." },
    { status: 503 },
  );
}

export function GET(request: Request): Promise<Response> | Response {
  return isAuthReady() ? handlers.GET(request) : unavailable();
}

export function POST(request: Request): Promise<Response> | Response {
  return isAuthReady() ? handlers.POST(request) : unavailable();
}
