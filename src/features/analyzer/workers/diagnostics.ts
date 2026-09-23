import { INSTAGRAM_PARSER_VERSION } from "@/features/analyzer/adapters/instagram";
import { FACEBOOK_PARSER_VERSION } from "@/features/analyzer/adapters/facebook";
import type { SocialPlatform } from "@/features/analyzer/model/types";
import type { ImportErrorCode } from "@/features/analyzer/model/errors";
import type { SafeImportDiagnostics } from "@/features/analyzer/workers/protocol";
import { APP_VERSION } from "@/lib/app-version";

const RECOGNIZED_KEYS = new Set([
  "relationships_followers",
  "relationships_followers_following",
  "relationships_following",
  "friends_v2",
  "friends",
  "followers_v3",
  "followers_v2",
  "following_v3",
  "following_v2",
  "following",
]);

export interface MutableDiagnosticState {
  parserVersion: string;
  archiveFileCount: number;
  matchedRelevantFilenames: string[];
  recognizedTopLevelKeys: Set<string>;
}

export function createDiagnosticState(platform: SocialPlatform = "instagram"): MutableDiagnosticState {
  return {
    parserVersion: platform === "facebook" ? FACEBOOK_PARSER_VERSION : INSTAGRAM_PARSER_VERSION,
    archiveFileCount: 0,
    matchedRelevantFilenames: [],
    recognizedTopLevelKeys: new Set<string>(),
  };
}

export function collectRecognizedTopLevelKeys(
  content: unknown,
  state: MutableDiagnosticState,
): void {
  if (typeof content !== "object" || content === null || Array.isArray(content)) return;
  for (const key of Object.keys(content)) {
    if (RECOGNIZED_KEYS.has(key)) state.recognizedTopLevelKeys.add(key);
  }
}

function browserFamilyAndVersion(userAgent: string): string {
  const matchers: readonly (readonly [string, RegExp])[] = [
    ["Edge", /Edg\/(\d+(?:\.\d+)?)/],
    ["Firefox", /Firefox\/(\d+(?:\.\d+)?)/],
    ["Chrome", /Chrome\/(\d+(?:\.\d+)?)/],
    ["Safari", /Version\/(\d+(?:\.\d+)?).*Safari\//],
  ];
  for (const [family, pattern] of matchers) {
    const match = pattern.exec(userAgent);
    if (match?.[1] !== undefined) return `${family} ${match[1]}`;
  }
  return "Unknown";
}

export function createSafeDiagnostics(
  state: MutableDiagnosticState,
  errorCode?: ImportErrorCode,
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): SafeImportDiagnostics {
  return {
    appVersion: APP_VERSION,
    parserVersion: state.parserVersion,
    browser: browserFamilyAndVersion(userAgent),
    archiveFileCount: state.archiveFileCount,
    matchedRelevantFilenames: [...new Set(state.matchedRelevantFilenames)].sort(),
    recognizedTopLevelKeys: [...state.recognizedTopLevelKeys].sort(),
    ...(errorCode === undefined ? {} : { errorCode }),
  };
}
