import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { databaseUrl } from "@/features/auth/server/environment";

const globalForAuthDatabase = globalThis as typeof globalThis & {
  folmetryAuthPool?: Pool;
  folmetryAuthPoolAttached?: boolean;
};

export const authDatabase =
  globalForAuthDatabase.folmetryAuthPool ??
  new Pool({
    connectionString: databaseUrl(),
    min: 1,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });

globalForAuthDatabase.folmetryAuthPool = authDatabase;

if (!globalForAuthDatabase.folmetryAuthPoolAttached) {
  attachDatabasePool(authDatabase);
  globalForAuthDatabase.folmetryAuthPoolAttached = true;
}
