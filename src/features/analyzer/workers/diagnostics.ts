import { INSTAGRAM_PARSER_VERSION } from "@/features/analyzer/adapters/instagram";
import type { ImportErrorCode } from "@/features/analyzer/model/errors";
import type { SafeImportDiagnostics } from "@/features/analyzer/workers/protocol";
import { APP_VERSION } from "@/lib/app-version";

const RECOGNIZED_KEYS = new Set([
  "relationships_followers",
  "relationships_followers_following",
  "relationships_following",
]);

export interface MutableDiagnosticState {
  archiveFileCount: number;
  matchedRelevantFilenames: string[];
  recognizedTopLevelKeys: Set<string>;
}

export function createDiagnosticState(): MutableDiagnosticState {
  return {
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
    parserVersion: INSTAGRAM_PARSER_VERSION,
    browser: browserFamilyAndVersion(userAgent),
    archiveFileCount: state.archiveFileCount,
    matchedRelevantFilenames: [...new Set(state.matchedRelevantFilenames)].sort(),
    recognizedTopLevelKeys: [...state.recognizedTopLevelKeys].sort(),
    ...(errorCode === undefined ? {} : { errorCode }),
  };
}
