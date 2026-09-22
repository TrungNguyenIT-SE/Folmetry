import { getRequestSession } from "@/features/auth/server/session";
import { PersistenceDomainError } from "@/features/analyzer/persistence/errors";
import {
  CloudAnalyzerRepository,
  MAX_SYNC_BODY_BYTES,
  assertSyncBodySize,
} from "@/features/analyzer/server/cloud-repository";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  const domain = error instanceof PersistenceDomainError
    ? error
    : new PersistenceDomainError("SYNC_UNAVAILABLE");
  const status = domain.code === "ACCOUNT_NOT_FOUND" || domain.code === "SNAPSHOT_NOT_FOUND"
    ? 404
    : domain.code === "SYNC_PAYLOAD_TOO_LARGE"
      ? 413
      : domain.code === "SYNC_UNAVAILABLE"
        ? 503
        : 400;
  return Response.json({ code: domain.code, context: domain.context }, { status });
}

async function repository(request: Request): Promise<CloudAnalyzerRepository | Response> {
  const session = await getRequestSession(request);
  return session === null
    ? Response.json({ code: "UNAUTHORIZED" }, { status: 401 })
    : new CloudAnalyzerRepository(session.user.id);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  assertSyncBodySize(request);
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    throw new PersistenceDomainError("SYNC_UNAVAILABLE");
  }
  const rawBody = await request.text();
  const byteLength = new TextEncoder().encode(rawBody).byteLength;
  if (byteLength > MAX_SYNC_BODY_BYTES) {
    throw new PersistenceDomainError("SYNC_PAYLOAD_TOO_LARGE", {
      limit: MAX_SYNC_BODY_BYTES,
      actual: byteLength,
    });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    throw new PersistenceDomainError("SYNC_UNAVAILABLE");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PersistenceDomainError("SYNC_UNAVAILABLE");
  }
  return body as Record<string, unknown>;
}

export async function GET(request: Request): Promise<Response> {
  const repo = await repository(request);
  if (repo instanceof Response) return repo;
  const url = new URL(request.url);
  try {
    const resource = url.searchParams.get("resource");
    if (resource === "accounts") {
      return Response.json({ accounts: await repo.listAccounts() });
    }
    if (resource === "snapshots") {
      const accountId = url.searchParams.get("accountId");
      if (!accountId) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
      return Response.json({ snapshots: await repo.listSnapshots(accountId) });
    }
    if (resource === "snapshot") {
      const id = url.searchParams.get("id");
      if (!id) throw new PersistenceDomainError("SNAPSHOT_NOT_FOUND");
      return Response.json({ snapshot: await repo.getSnapshot(id) ?? null });
    }
    return errorResponse(new PersistenceDomainError("SYNC_UNAVAILABLE"));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const repo = await repository(request);
  if (repo instanceof Response) return repo;
  try {
    const body = await readBody(request);
    if (body["action"] === "createAccount") {
      return Response.json({ account: await repo.createAccount(body["input"] as never) }, { status: 201 });
    }
    if (body["action"] === "saveSnapshot") {
      return Response.json({ result: await repo.saveSnapshot(body["input"] as never) });
    }
    return errorResponse(new PersistenceDomainError("SYNC_UNAVAILABLE"));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const repo = await repository(request);
  if (repo instanceof Response) return repo;
  try {
    const body = await readBody(request);
    if (body["action"] !== "updateAccount" || typeof body["id"] !== "string") {
      throw new PersistenceDomainError("SYNC_UNAVAILABLE");
    }
    return Response.json({ account: await repo.updateAccount(body["id"], body["input"] as never) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const repo = await repository(request);
  if (repo instanceof Response) return repo;
  try {
    const body = await readBody(request);
    if (body["action"] === "deleteAll") {
      await repo.deleteAll();
    } else if (body["action"] === "deleteAccount" && typeof body["id"] === "string") {
      await repo.deleteAccount(body["id"]);
    } else if (
      body["action"] === "deleteSnapshot" &&
      typeof body["accountId"] === "string" &&
      typeof body["snapshotId"] === "string"
    ) {
      await repo.deleteSnapshot(body["accountId"], body["snapshotId"]);
    } else {
      throw new PersistenceDomainError("SYNC_UNAVAILABLE");
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
