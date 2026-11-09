import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor Preview / port-forwarded access from 127.0.0.1
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
