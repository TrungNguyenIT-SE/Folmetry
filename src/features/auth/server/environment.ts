import "server-only";

const DEVELOPMENT_DATABASE_URL = "postgresql://folmetry:folmetry@127.0.0.1:5432/folmetry";
const DEVELOPMENT_AUTH_SECRET = "folmetry-build-placeholder-secret-never-use-in-production";

const requiredAuthVariables = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

const requiredMailVariables = ["SMTP_USER", "SMTP_PASSWORD"] as const;

export interface AuthReadiness {
  readonly authReady: boolean;
  readonly mailReady: boolean;
  readonly missing: readonly string[];
}

export function getAuthReadiness(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AuthReadiness {
  const missingAuth = requiredAuthVariables.filter((key) => {
    const value = environment[key]?.trim();
    return !value || (key === "BETTER_AUTH_SECRET" && value.length < 32);
  });
  const missingMail = requiredMailVariables.filter((key) => !environment[key]?.trim());
  return {
    authReady: missingAuth.length === 0,
    mailReady: missingMail.length === 0,
    missing: [...missingAuth, ...missingMail],
  };
}

export function authBaseUrl(): string {
  return process.env["BETTER_AUTH_URL"]?.trim() || "http://localhost:3000";
}

export function authSecret(): string {
  return process.env["BETTER_AUTH_SECRET"]?.trim() || DEVELOPMENT_AUTH_SECRET;
}

export function databaseUrl(): string {
  return process.env["DATABASE_URL"]?.trim() || DEVELOPMENT_DATABASE_URL;
}

export function isAuthReady(): boolean {
  return getAuthReadiness().authReady;
}

export function isMailReady(): boolean {
  return getAuthReadiness().mailReady;
}
