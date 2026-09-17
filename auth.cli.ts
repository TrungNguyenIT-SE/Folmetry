// Schema-only Better Auth configuration for the CLI. Runtime secrets, SMTP and
// authorization hooks remain in src/features/auth/server/auth.ts.
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import { Pool } from "pg";

const connectionString =
  process.env["DATABASE_URL"] ??
  "postgresql://folmetry:folmetry@127.0.0.1:5432/folmetry";

export const auth = betterAuth({
  database: new Pool({ connectionString }),
  emailAndPassword: { enabled: true },
  rateLimit: { enabled: true, storage: "database" },
  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
  ],
});
