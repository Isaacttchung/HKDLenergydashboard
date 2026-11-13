import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Allow Cursor Preview / port-forwarded access from 127.0.0.1
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Repo root may hold a second package-lock.json; trace from this app only.
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
