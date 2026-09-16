import "server-only";

import { StoryError } from "../model";

export type SupportedStoryProvider = "instagapi";
type StoryEnvironment = Readonly<Record<string, string | undefined>>;

export interface StoryServerConfig {
  readonly enabled: boolean;
  readonly provider: SupportedStoryProvider;
  readonly apiKey: string;
  readonly mediaTokenKeys: ReadonlyMap<string, Uint8Array>;
  readonly activeMediaKeyVersion: string;
  readonly mediaHosts: ReadonlySet<string>;
  readonly providerBaseUrl: string;
}

function decodeKey(encoded: string): Uint8Array {
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.length !== 32) throw new Error("invalid length");
    return bytes;
  } catch (error) {
    throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED", { cause: error });
  }
}

function readKeyring(env: StoryEnvironment): { keys: ReadonlyMap<string, Uint8Array>; active: string } {
  const entries = env["STORY_MEDIA_TOKEN_KEYS"]?.split(",").map((item) => item.trim()).filter(Boolean);
  const pairs = entries?.map((entry) => {
    const separator = entry.indexOf(":");
    if (separator < 1) throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
    return [entry.slice(0, separator), decodeKey(entry.slice(separator + 1))] as const;
  });
  const fallback = env["STORY_MEDIA_TOKEN_SECRET"];
  const keyPairs = pairs?.length ? pairs : fallback ? [["v1", decodeKey(fallback)] as const] : [];
  const keys = new Map(keyPairs);
  const active = env["STORY_MEDIA_TOKEN_ACTIVE_KEY"] ?? keyPairs[0]?.[0] ?? "";
  if (keys.size === 0 || !keys.has(active)) throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  return { keys, active };
}

function parseMediaHosts(value: string | undefined): ReadonlySet<string> {
  const hosts = new Set((value ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
  if (hosts.size === 0 || [...hosts].some((host) => host.includes("*") || host === "localhost")) {
    throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  }
  return hosts;
}

export function readStoryServerConfig(env: StoryEnvironment = process.env): StoryServerConfig {
  if (env["STORY_FEATURE_ENABLED"] !== "true") throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  if (env["STORY_PROVIDER_APPROVED"] !== "true") throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  if (env["STORY_PROVIDER"] !== "instagapi" || !env["STORY_PROVIDER_API_KEY"]) {
    throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  }
  const keyring = readKeyring(env);
  return {
    enabled: true,
    provider: "instagapi",
    apiKey: env["STORY_PROVIDER_API_KEY"],
    mediaTokenKeys: keyring.keys,
    activeMediaKeyVersion: keyring.active,
    mediaHosts: parseMediaHosts(env["STORY_MEDIA_HOSTS"]),
    providerBaseUrl: "https://api.instagapi.com",
  };
}
