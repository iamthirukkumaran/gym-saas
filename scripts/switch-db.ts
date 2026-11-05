/**
 * Flips prisma/schema.prisma between the SQLite and Postgres providers.
 *
 *   npm run use:postgres   # before deploying
 *   npm run use:sqlite     # back to local development
 *
 * This exists because Prisma requires the datasource provider to be a
 * literal in the schema — it cannot be read from an environment variable.
 * Everything else about the switch is already automatic: lib/db.ts picks the
 * driver adapter from the shape of DATABASE_URL at runtime.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";
const target = process.argv[2];

if (target !== "postgres" && target !== "sqlite") {
  console.error("Usage: tsx scripts/switch-db.ts <postgres|sqlite>");
  process.exit(1);
}

const provider = target === "postgres" ? "postgresql" : "sqlite";
const original = readFileSync(SCHEMA, "utf8");

const updated = original.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]+(")/,
  `$1${provider}$2`,
);

if (updated === original) {
  const current = /datasource\s+db\s*\{[^}]*?provider\s*=\s*"([^"]+)"/.exec(original)?.[1];
  if (current === provider) {
    console.log(`Already using "${provider}". Nothing to do.`);
    process.exit(0);
  }
  console.error(`Could not find the datasource provider in ${SCHEMA}.`);
  process.exit(1);
}

writeFileSync(SCHEMA, updated);
console.log(`✔ schema.prisma provider set to "${provider}"`);

if (target === "postgres") {
  console.log(`
Next steps:

  1. Set DATABASE_URL to your Postgres connection string
  2. npx prisma db push          # or: npx prisma migrate dev --name init
  3. npm run db:seed             # creates admin, plans and template library
  4. npm run build

See DEPLOYMENT.md for the full walkthrough.
`);
} else {
  console.log("\nRun `npm run db:reset` to rebuild the local SQLite database.\n");
}
