import type { MetadataRoute } from "next";

import folmetryLogo from "../../folmetry.png";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return { name: SITE_NAME, short_name: "Folmetry", description: SITE_DESCRIPTION, start_url: "/", display: "standalone", background_color: "#f7f8fa", theme_color: "#335cff", icons: [{ src: folmetryLogo.src, sizes: "1254x1254", type: "image/png", purpose: "any" }] };
}
