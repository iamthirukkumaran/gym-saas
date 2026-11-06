import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev badge is pinned bottom-left, exactly where the sidebar's user
  // footer lives — it covers the avatar and sign-out button while developing.
  devIndicators: false,
  // Pin the workspace root. Without this, Turbopack walks up and finds a
  // stray lockfile in the home directory and warns about its scope.
  turbopack: { root: import.meta.dirname },
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "pg",
    "@prisma/adapter-pg",
  ],
  experimental: {
    // Server Actions receive CSV uploads; raise the body cap from the 1MB default.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
