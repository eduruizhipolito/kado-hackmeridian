import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Batch manifests are read with fs at runtime; ship them with every route.
  outputFileTracingIncludes: {
    "/**": ["./batches/*.json"],
  },
};

export default nextConfig;
