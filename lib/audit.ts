// Server-side only: imports the Prisma client and is also invoked from the
// CLI (scripts/run-engine.ts, prisma/seed.ts), so it deliberately does not
// use the `server-only` marker — that package throws outside React's server
// condition. Importing this from a Client Component fails at build time
// anyway, because Prisma cannot be bundled for the browser.
import { db } from "./db";

type AuditInput = {
  gymId?: string | null;
  actorType: "PLATFORM" | "STAFF" | "SYSTEM";
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Append-only activity trail.
 *
 * Deliberately swallows its own errors: an audit write must never be the
 * reason a member's payment fails to save.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        gymId: input.gymId ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        metaJson: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}
