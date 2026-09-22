import { auth } from "@/features/auth/server/auth";
import { getRequestSession } from "@/features/auth/server/session";
import { isPasswordPolicySatisfied } from "@/features/auth/password-policy";

export const runtime = "nodejs";

function safeErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "PASSWORD_SETUP_FAILED";
  const body = "body" in error ? error.body : undefined;
  if (typeof body !== "object" || body === null || !("code" in body)) return "PASSWORD_SETUP_FAILED";
  return typeof body.code === "string" ? body.code : "PASSWORD_SETUP_FAILED";
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    return Response.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  }

  const session = await getRequestSession(request);
  if (session === null) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  }
  const newPassword = typeof body === "object" && body !== null && "newPassword" in body
    ? (body as { newPassword?: unknown }).newPassword
    : undefined;
  if (typeof newPassword !== "string" || !isPasswordPolicySatisfied(newPassword)) {
    return Response.json({ code: "PASSWORD_POLICY_VIOLATION" }, { status: 400 });
  }

  try {
    const accounts = await auth.api.listUserAccounts({ headers: request.headers });
    if (accounts.some((account) => account.providerId === "credential")) {
      return Response.json({ code: "PASSWORD_ALREADY_SET" }, { status: 409 });
    }
    await auth.api.setPassword({ body: { newPassword }, headers: request.headers });
    return Response.json({ status: true });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = code === "UNAUTHORIZED" ? 401 : code === "PASSWORD_ALREADY_SET" ? 409 : 400;
    return Response.json({ code }, { status });
  }
}
