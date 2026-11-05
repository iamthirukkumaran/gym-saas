import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env — do it explicitly (Node >= 20.6).
try {
  process.loadEnvFile(".env");
} catch {
  /* .env is optional; env vars may come from the shell or host */
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
