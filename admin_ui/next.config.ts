import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { API_URL } from "./src/lib/config";

const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["frontend.abhifithealthclub.com"],
  turbopack: {
    root: appRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}:path*`,
      },
    ];
  },
};

export default nextConfig;
