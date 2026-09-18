import "server-only";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type AuthSession } from "@/features/auth/server/auth";
import { isAuthReady } from "@/features/auth/server/environment";

function e2eSession(requestHeaders: Headers): AuthSession | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const credential = requestHeaders.get("x-folmetry-e2e-auth") ?? "";
  const match = /^playwright-local-only(?::([a-z0-9-]{1,32}))?$/.exec(credential);
  if (match === null) return null;
  const identity = match[1];
  const userId = identity === undefined ? "folmetry-e2e-user" : `folmetry-e2e-${identity}`;
  const createdAt = new Date(0);
  return {
    user: {
      id: userId,
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
      id: `${userId}-session`,
      token: "test-token-not-valid-outside-e2e",
      userId,
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
