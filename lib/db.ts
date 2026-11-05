import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client.
 *
 * Prisma 7 talks to the database through a driver adapter, chosen here from
 * the shape of DATABASE_URL:
 *
 *   file:./prisma/astryx.db        → better-sqlite3  (local development)
 *   postgres://… / postgresql://…  → pg              (production)
 *
 * Both adapters are imported statically so the bundler can resolve them, but
 * only one is ever instantiated. Picking at runtime means moving to Postgres
 * is a change of environment variable plus one line in schema.prisma
 * (`provider`), with no application code touched — see DEPLOYMENT.md.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createAdapter(url: string) {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaPg({ connectionString: url });
  }
  return new PrismaBetterSqlite3({ url });
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, then run `npm run db:reset`.",
    );
  }

  return new PrismaClient({
    adapter: createAdapter(url),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse one client across hot reloads in dev, otherwise every edit leaks a
// connection pool.
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
