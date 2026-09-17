import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

export const alt = `${SITE_NAME} — private relationship analysis`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

const logoData = await readFile(join(process.cwd(), "folmetry.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", color: "#17202a", background: "#f7f8fa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "22px", fontSize: 34, fontWeight: 700 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a native img for an embedded local asset. */}
        <img alt="" height={112} src={logoSrc} style={{ borderRadius: "22px" }} width={112} />
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}><div style={{ maxWidth: 950, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-3px" }}>See what changed without handing over your password.</div><div style={{ maxWidth: 900, color: "#5f6b78", fontSize: 30, lineHeight: 1.35 }}>{SITE_DESCRIPTION}</div></div>
    </div>,
    size,
  );
}
