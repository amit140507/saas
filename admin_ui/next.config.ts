import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";
const backendApiUrl = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["frontend.abhifithealthclub.com"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendApiUrl}:path*`,
      },
    ];
  },
};

export default nextConfig;
