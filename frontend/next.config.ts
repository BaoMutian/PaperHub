import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  // Fix Three.js compatibility with standalone mode
  transpilePackages: ['three', 'react-force-graph-3d'],
};

export default nextConfig;
