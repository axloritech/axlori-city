import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Arena preview is proxied from an e2b.app origin; allow it for dev HMR.
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.e2b.app"],
};

export default nextConfig;
