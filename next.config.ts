import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF parsing runs server-side; keep the parser out of the bundle.
  // Both ship native/worker code that must not be bundled: @napi-rs/canvas is
  // a platform-specific binary, and unpdf loads pdf.js at runtime.
  serverExternalPackages: ["unpdf", "@napi-rs/canvas"],
};

export default nextConfig;
