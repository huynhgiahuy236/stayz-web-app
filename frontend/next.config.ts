import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "stayz-api.onrender.com",
      },
    ],
  },
};

export default nextConfig;
