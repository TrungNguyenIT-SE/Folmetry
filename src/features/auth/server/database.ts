import "server-only";

import { Pool } from "pg";

import { databaseUrl } from "@/features/auth/server/environment";

const globalForAuthDatabase = globalThis as typeof globalThis & {
  folmetryAuthPool?: Pool;
};

export const authDatabase =
  globalForAuthDatabase.folmetryAuthPool ??
  new Pool({
    connectionString: databaseUrl(),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAuthDatabase.folmetryAuthPool = authDatabase;
}
