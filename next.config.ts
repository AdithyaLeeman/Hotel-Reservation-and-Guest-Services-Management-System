import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Prevent TypeScript build errors from blocking docker build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
