import { describe, expect, it } from "vitest";

import { hasValidSameOrigin } from "./http-security";

function request(headers: HeadersInit): Request {
  return new Request("http://internal:3000/api/example", { method: "POST", headers });
}

const invalidHeaders: HeadersInit[] = [
  {},
  { origin: "https://attacker.example" },
  { origin: "null" },
  { origin: "not-a-url" },
  { origin: "https://folmetry.example", "x-forwarded-host": "folmetry.example, attacker.example", "x-forwarded-proto": "https" },
];

describe("HTTP mutation origin validation", () => {
  it("accepts an origin matching the direct request URL", () => {
    expect(hasValidSameOrigin(request({ origin: "http://internal:3000" }))).toBe(true);
  });

  it("accepts a matching public origin behind a trusted reverse proxy", () => {
    expect(hasValidSameOrigin(request({
      origin: "https://folmetry.example",
      "x-forwarded-host": "folmetry.example",
      "x-forwarded-proto": "https",
    }))).toBe(true);
  });

  it.each(invalidHeaders)("rejects missing, opaque, malformed, foreign, or ambiguous origins", (headers) => {
    expect(hasValidSameOrigin(request(headers))).toBe(false);
  });
});
