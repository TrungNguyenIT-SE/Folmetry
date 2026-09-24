import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = resolve(root, "migrations");
const files = (await readdir(migrationsDirectory))
  .filter((name) => /^\d+[-_].+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
});
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1)", [1_811_625_994]);
  await client.query(`CREATE TABLE IF NOT EXISTS folmetry_schema_migration (
    name TEXT PRIMARY KEY,
    checksum CHAR(64),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE folmetry_schema_migration ADD COLUMN IF NOT EXISTS checksum CHAR(64)`);

  const result = await client.query("SELECT name, checksum FROM folmetry_schema_migration");
  const applied = new Map(result.rows.map((row) => [String(row.name), row.checksum === null ? null : String(row.checksum).trim()]));
  let appliedCount = 0;

  for (const file of files) {
    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previousChecksum = applied.get(file);
    if (previousChecksum !== undefined) {
      if (previousChecksum !== null && previousChecksum !== checksum) {
        throw new Error(`Applied migration was modified: ${file}`);
      }
      if (previousChecksum === null) {
        await client.query("UPDATE folmetry_schema_migration SET checksum = $2 WHERE name = $1", [file, checksum]);
      }
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO folmetry_schema_migration(name, checksum) VALUES ($1, $2)", [file, checksum]);
    appliedCount += 1;
    process.stdout.write(`Applied ${file}\n`);
  }

  await client.query("COMMIT");
  process.stdout.write(appliedCount === 0 ? "Database is already up to date.\n" : "Database migrations completed.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
