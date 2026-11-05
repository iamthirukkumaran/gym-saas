// Server-side only: imports the Prisma client and is also invoked from the
// CLI (scripts/run-engine.ts, prisma/seed.ts), so it deliberately does not
// use the `server-only` marker — that package throws outside React's server
// condition. Importing this from a Client Component fails at build time
// anyway, because Prisma cannot be bundled for the browser.
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { db } from "./db";
import { addDays, daysBetween, hourInZone, todayInZone, utcDay } from "./dates";
import { render } from "./templates";
import { sendViaGym } from "./whatsapp";
import type { Trigger } from "./constants";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The Astryx reminder engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs as one idempotent pass. Safe to invoke every 15 minutes, twice at
 * once, or three times after a crash — the result is identical.
 *
 * Three phases, deliberately separated:
 *
 *   1. syncStatuses — reconcile stored status columns with the calendar.
 *   2. planMessages — decide what *should* be sent and queue it.
 *   3. dispatchQueue — hand queued rows to the provider and record outcomes.
 *
 * Queue-then-send (rather than send-inline) is what makes the whole thing
 * debuggable: an owner can see tomorrow's messages before they go out, and a
 * provider outage never loses a reminder, it just leaves it QUEUED.
 *
 * Idempotency comes from `MessageLog.dedupeKey`, a UNIQUE column encoding
 * (gym, rule, member, occurrence-anchor). The anchor is the date that
 * identifies *this* occurrence — the expiry date, the join date, the
 * birthday year. When a member renews, the expiry changes, the anchor
 * changes, and next cycle's reminders are free to send again.
 */

const MAX_ATTEMPTS = 3;
/** Guards against one huge tenant starving the rest of a single run. */
const DISPATCH_BATCH = 200;

export type EngineResult = {
  runId: string;
  gymsProcessed: number;
  statusSynced: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  durationMs: number;
  notes: string[];
};

// ── Scheduling helpers ──────────────────────────────────────────────────────

/**
 * Converts "this calendar day, at this gym-local hour" into a real instant.
 * Without the timezone round-trip, a 10 AM reminder for a Kolkata gym would
 * fire at 10 AM wherever the server happens to live.
 */
function instantAt(dayUtc: Date, hour: number, tz: string): Date {
  const day = formatInTimeZone(dayUtc, "UTC", "yyyy-MM-dd");
  const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, "0");
  return fromZonedTime(`${day}T${hh}:00:00`, tz);
}

/**
 * Nudges a send time out of the gym's quiet hours.
 *
 * Nobody wants a renewal nudge at 2 AM — it reads as spam and gets the
 * number blocked, which is an existential risk for a WhatsApp-first product.
 */
function respectQuietHours(hour: number, quietStart: number, quietEnd: number): number {
  const inQuiet =
    quietStart === quietEnd
      ? false
      : quietStart < quietEnd
        ? hour >= quietStart && hour < quietEnd
        : hour >= quietStart || hour < quietEnd;
  return inQuiet ? quietEnd : hour;
}

// ── Phase 1: status reconciliation ──────────────────────────────────────────

/**
 * A membership that ended yesterday is still marked ACTIVE in the database
 * until something notices. This is that something.
 */
export async function syncStatuses(gymId?: string): Promise<number> {
  const gyms = await db.gym.findMany({
    where: gymId ? { id: gymId } : {},
    select: { id: true, timezone: true },
  });

  let changed = 0;

  for (const gym of gyms) {
    const today = todayInZone(gym.timezone);

    // Memberships whose window has closed.
    const expiredMemberships = await db.membership.updateMany({
      where: { gymId: gym.id, status: "ACTIVE", endDate: { lt: today } },
      data: { status: "EXPIRED" },
    });
    changed += expiredMemberships.count;

    // Memberships that were booked for a future start date and have now begun.
    const startedMemberships = await db.membership.updateMany({
      where: {
        gymId: gym.id,
        status: "UPCOMING",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      data: { status: "ACTIVE" },
    });
    changed += startedMemberships.count;

    // Members whose plan lapsed. FROZEN and CANCELLED are manual states and
    // are deliberately left alone.
    const expiredMembers = await db.member.updateMany({
      where: {
        gymId: gym.id,
        status: "ACTIVE",
        expiryDate: { lt: today },
      },
      data: { status: "EXPIRED" },
    });
    changed += expiredMembers.count;

    // Members who renewed while expired should come back to life.
    const revived = await db.member.updateMany({
      where: {
        gymId: gym.id,
        status: "EXPIRED",
        expiryDate: { gte: today },
      },
      data: { status: "ACTIVE" },
    });
    changed += revived.count;
  }

  return changed;
}

// ── Phase 2: planning ───────────────────────────────────────────────────────

type MemberForMessage = {
  id: string;
  name: string;
  code: string;
  phone: string;
  joinDate: Date;
  dob: Date | null;
  expiryDate: Date | null;
  activePlanName: string | null;
  balanceDue: number;
  lastCheckInAt: Date | null;
  waOptOut: boolean;
  trainer: { name: string } | null;
};

const MEMBER_SELECT = {
  id: true,
  name: true,
  code: true,
  phone: true,
  joinDate: true,
  dob: true,
  expiryDate: true,
  activePlanName: true,
  balanceDue: true,
  lastCheckInAt: true,
  waOptOut: true,
  trainer: { select: { name: true } },
} as const;

/**
 * Finds the members a rule applies to *today*, plus the occurrence anchor
 * used for deduplication.
 *
 * Every trigger matches on an exact day rather than a range. A range would
 * re-send on every run until the window closed; an exact match means each
 * member hears from the gym once per occurrence, which is the difference
 * between a helpful nudge and being blocked.
 */
async function candidatesFor(
  gymId: string,
  tz: string,
  trigger: Trigger,
  offsetDays: number,
): Promise<{ member: MemberForMessage; anchor: string }[]> {
  const today = todayInZone(tz);
  const offset = Math.abs(offsetDays);

  switch (trigger) {
    case "BEFORE_EXPIRY":
    case "ON_EXPIRY":
    case "AFTER_EXPIRY": {
      const target =
        trigger === "BEFORE_EXPIRY"
          ? addDays(today, offset)
          : trigger === "AFTER_EXPIRY"
            ? addDays(today, -offset)
            : today;

      const members = await db.member.findMany({
        where: {
          gymId,
          status: { in: ["ACTIVE", "EXPIRED"] },
          expiryDate: target,
        },
        select: MEMBER_SELECT,
      });
      return members.map((m) => ({
        member: m,
        anchor: m.expiryDate ? formatInTimeZone(m.expiryDate, "UTC", "yyyy-MM-dd") : "none",
      }));
    }

    case "WELCOME": {
      const members = await db.member.findMany({
        where: {
          gymId,
          status: { in: ["ACTIVE", "FROZEN"] },
          joinDate: addDays(today, -offset),
        },
        select: MEMBER_SELECT,
      });
      return members.map((m) => ({
        member: m,
        anchor: formatInTimeZone(m.joinDate, "UTC", "yyyy-MM-dd"),
      }));
    }

    case "BIRTHDAY": {
      // SQLite can't index on (month, day), so this filters in memory. Fine
      // at tenant scale — a gym has hundreds of members, not millions.
      const members = await db.member.findMany({
        where: { gymId, status: { in: ["ACTIVE", "FROZEN"] }, dob: { not: null } },
        select: MEMBER_SELECT,
      });
      const todayMd = formatInTimeZone(today, "UTC", "MM-dd");
      const year = formatInTimeZone(today, "UTC", "yyyy");
      return members
        .filter((m) => m.dob && formatInTimeZone(m.dob, "UTC", "MM-dd") === todayMd)
        .map((m) => ({ member: m, anchor: year }));
    }

    case "DUES_PENDING": {
      // Anchored to the membership, so a member is chased once for a given
      // outstanding balance rather than every single night.
      const memberships = await db.membership.findMany({
        where: {
          gymId,
          status: { in: ["ACTIVE", "EXPIRED"] },
          startDate: addDays(today, -offset),
          member: { balanceDue: { gt: 0 } },
        },
        select: { id: true, member: { select: MEMBER_SELECT } },
      });
      return memberships.map((ms) => ({ member: ms.member, anchor: ms.id }));
    }

    case "INACTIVITY": {
      // Paid up but not turning up — the churn signal expiry dates miss.
      const members = await db.member.findMany({
        where: {
          gymId,
          status: "ACTIVE",
          expiryDate: { gte: today },
          lastCheckInAt: { not: null },
        },
        select: MEMBER_SELECT,
      });
      return members
        .filter(
          (m) => m.lastCheckInAt && daysBetween(utcDay(m.lastCheckInAt), today) === offset,
        )
        .map((m) => ({
          member: m,
          anchor: m.lastCheckInAt
            ? formatInTimeZone(utcDay(m.lastCheckInAt), "UTC", "yyyy-MM-dd")
            : "none",
        }));
    }

    default:
      return [];
  }
}

/** Messages already counted against this gym's monthly allowance. */
async function monthlyUsage(gymId: string, tz: string): Promise<number> {
  const [y, m] = formatInTimeZone(new Date(), tz, "yyyy-MM").split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return db.messageLog.count({
    where: {
      gymId,
      status: { in: ["SENT", "DELIVERED", "READ", "QUEUED"] },
      createdAt: { gte: start, lt: end },
    },
  });
}

async function planForGym(gym: {
  id: string;
  name: string;
  phone: string;
  ownerName: string;
  timezone: string;
  upiId: string | null;
  autoRemindersEnabled: boolean;
  reminderSendHour: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  status: string;
  saasPlan: { waMessageLimit: number } | null;
}): Promise<{ queued: number; skipped: number; notes: string[] }> {
  const notes: string[] = [];
  let queued = 0;
  let skipped = 0;

  if (!gym.autoRemindersEnabled) {
    return { queued, skipped, notes: [`${gym.name}: automations paused by owner`] };
  }
  if (gym.status === "SUSPENDED" || gym.status === "CANCELLED") {
    return { queued, skipped, notes: [`${gym.name}: tenant ${gym.status.toLowerCase()}`] };
  }

  const rules = await db.reminderRule.findMany({
    where: { gymId: gym.id, enabled: true },
    include: { template: true },
  });
  if (rules.length === 0) return { queued, skipped, notes };

  const limit = gym.saasPlan?.waMessageLimit ?? -1;
  let used = limit === -1 ? 0 : await monthlyUsage(gym.id, gym.timezone);

  const today = todayInZone(gym.timezone);
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  // Planning is split from writing so the whole batch can be deduplicated in
  // one query. Inserting and catching UNIQUE violations also works, but it
  // emits a constraint error per already-planned message — tens of scary log
  // lines per run that hide real failures.
  type Planned = {
    dedupeKey: string;
    data: Parameters<typeof db.messageLog.create>[0]["data"];
    skipped: boolean;
  };
  const planned: Planned[] = [];

  for (const rule of rules) {
    const template = rule.template;
    if (!template || !template.active) {
      notes.push(`${gym.name}: rule "${rule.name}" has no active template (${rule.templateKey})`);
      continue;
    }

    const candidates = await candidatesFor(
      gym.id,
      gym.timezone,
      rule.trigger as Trigger,
      rule.offsetDays,
    );
    if (candidates.length === 0) continue;

    const hour = respectQuietHours(
      rule.sendHour ?? gym.reminderSendHour,
      gym.quietHoursStart,
      gym.quietHoursEnd,
    );
    const scheduledFor = instantAt(today, hour, gym.timezone);

    for (const { member, anchor } of candidates) {
      // Opt-out and plan limits are recorded as SKIPPED rows rather than
      // silently dropped — an owner asking "why didn't Rahul get it?" gets
      // an answer instead of a shrug.
      let skipReason: string | null = null;
      if (member.waOptOut) skipReason = "Member opted out of WhatsApp";
      else if (!member.phone) skipReason = "No phone number on record";
      else if (limit !== -1 && used >= limit) {
        skipReason = `Monthly message limit reached (${limit})`;
      }

      const body = render(template.body, {
        member,
        gym: {
          name: gym.name,
          phone: gym.phone,
          ownerName: gym.ownerName,
          timezone: gym.timezone,
          upiId: gym.upiId,
        },
        extra: { renew_link: `${appUrl}/r/${member.id}` },
      });

      const dedupeKey = `${gym.id}:${rule.id}:${member.id}:${anchor}`;
      planned.push({
        dedupeKey,
        skipped: Boolean(skipReason),
        data: {
          gymId: gym.id,
          memberId: member.id,
          toPhone: member.phone,
          templateKey: template.key,
          ruleId: rule.id,
          body,
          kind: "AUTOMATED",
          status: skipReason ? "SKIPPED" : "QUEUED",
          skipReason,
          provider: "pending",
          scheduledFor,
          dedupeKey,
        },
      });

      if (!skipReason && limit !== -1) used++;
    }
  }

  if (planned.length === 0) return { queued, skipped, notes };

  // Drop anything already planned on an earlier run.
  const existing = await db.messageLog.findMany({
    where: { dedupeKey: { in: planned.map((p) => p.dedupeKey) } },
    select: { dedupeKey: true },
  });
  const seen = new Set(existing.map((e) => e.dedupeKey));
  const fresh = planned.filter((p) => !seen.has(p.dedupeKey));

  for (const item of fresh) {
    try {
      await db.messageLog.create({ data: item.data });
      if (item.skipped) skipped++;
      else queued++;
    } catch (err) {
      // Only reachable if two engine passes race between the SELECT above and
      // this INSERT. The UNIQUE index is the real guarantee; this is the net.
      const code = (err as { code?: string }).code;
      if (code !== "P2002") {
        notes.push(`${gym.name}: queue failed — ${String(err)}`);
      }
    }
  }

  return { queued, skipped, notes };
}

// ── Phase 3: dispatch ───────────────────────────────────────────────────────

async function dispatchQueue(
  gymId?: string,
): Promise<{ sent: number; failed: number; notes: string[] }> {
  const notes: string[] = [];
  let sent = 0;
  let failed = 0;

  const due = await db.messageLog.findMany({
    where: {
      ...(gymId ? { gymId } : {}),
      status: "QUEUED",
      scheduledFor: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: { gym: true },
    orderBy: { scheduledFor: "asc" },
    take: DISPATCH_BATCH,
  });

  for (const msg of due) {
    const gym = msg.gym;
    const attempts = msg.attempts + 1;

    const result = await sendViaGym(gym, {
      to: msg.toPhone,
      body: msg.body,
      templateKey: msg.templateKey,
      templateName: msg.templateKey,
    });

    if (result.ok) {
      await db.messageLog.update({
        where: { id: msg.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          provider: gym.waProvider,
          providerMessageId: result.providerMessageId ?? null,
          costPaise: result.costPaise ?? 0,
          attempts,
          error: null,
        },
      });
      await db.member
        .update({ where: { id: msg.memberId ?? "" }, data: { lastMessageAt: new Date() } })
        .catch(() => {
          /* message may not be tied to a member (broadcast to a lead) */
        });
      sent++;
      continue;
    }

    // Retryable failures stay QUEUED with a backoff; terminal ones stop here.
    const exhausted = attempts >= MAX_ATTEMPTS || result.retryable === false;
    await db.messageLog.update({
      where: { id: msg.id },
      data: {
        status: exhausted ? "FAILED" : "QUEUED",
        attempts,
        error: result.error ?? "Unknown provider error",
        provider: gym.waProvider,
        // Exponential-ish backoff: 10 min, then 40 min.
        scheduledFor: exhausted
          ? msg.scheduledFor
          : new Date(Date.now() + 10 * 60_000 * attempts * attempts),
      },
    });

    if (exhausted) {
      failed++;
      notes.push(`${gym.name}: send to ${msg.toPhone} failed — ${result.error}`);
    }
  }

  return { sent, failed, notes };
}

// ── Orchestration ───────────────────────────────────────────────────────────

/**
 * One full engine pass. `gymId` scopes it to a single tenant, which is what
 * the "Run now" button in the owner dashboard uses.
 */
export async function runEngine(opts?: {
  gymId?: string;
  trigger?: "CRON" | "MANUAL";
}): Promise<EngineResult> {
  const started = Date.now();
  const run = await db.engineRun.create({
    data: { trigger: opts?.trigger ?? "CRON" },
  });

  const notes: string[] = [];
  let statusSynced = 0;
  let queued = 0;
  let skipped = 0;
  let sent = 0;
  let failed = 0;
  let gymsProcessed = 0;
  let errorText: string | null = null;

  try {
    statusSynced = await syncStatuses(opts?.gymId);

    const gyms = await db.gym.findMany({
      where: opts?.gymId ? { id: opts.gymId } : {},
      include: { saasPlan: { select: { waMessageLimit: true } } },
    });

    for (const gym of gyms) {
      gymsProcessed++;
      const planned = await planForGym(gym);
      queued += planned.queued;
      skipped += planned.skipped;
      notes.push(...planned.notes);
    }

    const dispatched = await dispatchQueue(opts?.gymId);
    sent = dispatched.sent;
    failed = dispatched.failed;
    notes.push(...dispatched.notes);
  } catch (err) {
    errorText = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error("[engine] run failed", err);
  }

  await db.engineRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      gymsProcessed,
      queued,
      sent,
      failed,
      skipped,
      statusSynced,
      errorText,
    },
  });

  return {
    runId: run.id,
    gymsProcessed,
    statusSynced,
    queued,
    sent,
    failed,
    skipped,
    durationMs: Date.now() - started,
    notes,
  };
}

/**
 * Preview of what the engine *would* queue for a gym today, without writing
 * anything. Powers the "next 7 days of reminders" panel so an owner can see
 * and trust the automation before it speaks to their members.
 */
export async function previewUpcoming(gymId: string, days = 7) {
  const gym = await db.gym.findUnique({
    where: { id: gymId },
    include: { rules: { where: { enabled: true }, include: { template: true } } },
  });
  if (!gym) return [];

  const today = todayInZone(gym.timezone);
  const out: {
    date: Date;
    ruleName: string;
    trigger: string;
    templateKey: string;
    count: number;
  }[] = [];

  for (let d = 0; d < days; d++) {
    const day = addDays(today, d);

    for (const rule of gym.rules) {
      // Reuse the real matcher by shifting the offset, so the preview can't
      // drift away from what the engine actually does.
      const shifted =
        rule.trigger === "BEFORE_EXPIRY"
          ? rule.offsetDays + d
          : rule.trigger === "AFTER_EXPIRY"
            ? rule.offsetDays - d
            : rule.offsetDays;

      if (rule.trigger === "AFTER_EXPIRY" && shifted < 0) continue;
      if (rule.trigger !== "BEFORE_EXPIRY" && rule.trigger !== "AFTER_EXPIRY" && d > 0) continue;

      const candidates = await candidatesFor(
        gym.id,
        gym.timezone,
        rule.trigger as Trigger,
        shifted,
      );
      if (candidates.length === 0) continue;

      out.push({
        date: day,
        ruleName: rule.name,
        trigger: rule.trigger,
        templateKey: rule.templateKey,
        count: candidates.length,
      });
    }
  }

  return out;
}

export function hourNowInGym(tz: string): number {
  return hourInZone(tz);
}
