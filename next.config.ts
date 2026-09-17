import type { NextConfig } from "next";

const configuredDevOrigins = process.env["DEV_ALLOWED_ORIGINS"]
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set(["127.0.0.1", "localhost", ...configuredDevOrigins])],
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
