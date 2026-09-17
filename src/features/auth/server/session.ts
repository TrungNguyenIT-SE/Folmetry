import "server-only";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type AuthSession } from "@/features/auth/server/auth";
import { isAuthReady } from "@/features/auth/server/environment";

function e2eSession(requestHeaders: Headers): AuthSession | null {
  if (
    process.env.NODE_ENV === "production" ||
    requestHeaders.get("x-folmetry-e2e-auth") !== "playwright-local-only"
  ) {
    return null;
  }
  const createdAt = new Date(0);
  return {
    user: {
      id: "folmetry-e2e-user",
      name: "Folmetry E2E",
      email: "e2e@example.invalid",
      emailVerified: true,
      createdAt,
      updatedAt: createdAt,
      role: "admin",
      banned: false,
      banReason: null,
      banExpires: null,
    },
    session: {
      id: "folmetry-e2e-session",
      token: "test-token-not-valid-outside-e2e",
      userId: "folmetry-e2e-user",
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(4_102_444_800_000),
      ipAddress: null,
      userAgent: null,
      impersonatedBy: undefined,
    },
  };
}

export async function getServerSession(): Promise<AuthSession | null> {
  const requestHeaders = await headers();
  const testSession = e2eSession(requestHeaders);
  if (testSession !== null) return testSession;
  if (!isAuthReady()) return null;
  try {
    return await auth.api.getSession({ headers: requestHeaders });
  } catch {
    return null;
  }
}

export async function getRequestSession(request: Request): Promise<AuthSession | null> {
  const testSession = e2eSession(request.headers);
  if (testSession !== null) return testSession;
  if (!isAuthReady()) return null;
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

export async function requireApiUser(request: Request): Promise<Response | undefined> {
  return (await getRequestSession(request)) === null
    ? Response.json({ code: "UNAUTHORIZED", message: "Authentication required." }, { status: 401 })
    : undefined;
}

export async function requireUser(returnTo: string): Promise<AuthSession> {
  const session = await getServerSession();
  if (session === null) redirect(`/login?next=${encodeURIComponent(returnTo)}` as Route);
  return session;
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireUser("/admin/users");
  const roles = String(session.user.role ?? "user").split(",");
  if (!roles.includes("admin")) redirect("/app");
  return session;
}
