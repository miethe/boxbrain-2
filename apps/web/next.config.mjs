import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  reactStrictMode: true,
  // Browser code fetches same-origin /api/* (see lib/api.ts apiUrl); the Next server proxies
  // to the FastAPI backend. Resolved when the server starts, so deploys and e2e can retarget
  // without rebuilding the client bundle (NEXT_PUBLIC_* is baked at build time).
  async rewrites() {
    const target =
      process.env.BOXBRAIN_API_PROXY_TARGET ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:8300";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  }
};

export default nextConfig;
