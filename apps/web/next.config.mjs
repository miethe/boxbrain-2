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
  //
  // The proxy runs server-side, so it must target the server-reachable API host — inside the
  // container that is http://api:8000, NOT the browser-facing NEXT_PUBLIC_API_BASE_URL (which
  // resolves to localhost and refuses connections in-container). Prefer the explicit proxy
  // override, then the server base URL (set by compose), and only fall back to the public URL
  // for host-local dev where localhost is correct.
  async rewrites() {
    const target =
      process.env.BOXBRAIN_API_PROXY_TARGET ??
      process.env.BOXBRAIN_SERVER_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:8300";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  }
};

export default nextConfig;
