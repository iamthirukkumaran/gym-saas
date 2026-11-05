// Server-side only: imports the Prisma client and is also invoked from the
// CLI (scripts/run-engine.ts, prisma/seed.ts), so it deliberately does not
// use the `server-only` marker — that package throws outside React's server
// condition. Importing this from a Client Component fails at build time
// anyway, because Prisma cannot be bundled for the browser.
import { db } from "./db";
import { hashPassword } from "./auth";
import { addDays, todayInZone } from "./dates";
import { DEFAULT_MEMBERSHIP_PLANS, DEFAULT_TEMPLATES } from "./defaults";
import { TRIGGER_LABELS, type Trigger } from "./constants";

/**
 * Tenant provisioning.
 *
 * Creating a gym is not one INSERT — it's a gym, an owner login, a plan
 * catalogue, a template library, the automations wired to those templates,
 * and a subscription. Doing it in one transaction means a half-built tenant
 * can never exist, which matters because a gym with templates but no rules
 * looks like the product is broken.
 */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "gym";
  let candidate = root;
  let n = 1;
  while (await db.gym.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export type ProvisionInput = {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  planKey: string;
  billingCycle: "MONTHLY" | "YEARLY";
  trialDays: number;
  password: string;
  provisionedBy?: { id: string; name: string } | null;
};

export async function provisionGym(input: ProvisionInput) {
  const plan = await db.saasPlan.findUnique({ where: { key: input.planKey } });
  if (!plan) throw new Error(`Subscription plan "${input.planKey}" does not exist`);

  const existing = await db.gym.findUnique({ where: { email: input.email } });
  if (existing) throw new Error(`A gym is already registered with ${input.email}`);

  const slug = await uniqueSlug(input.name);
  const passwordHash = await hashPassword(input.password);
  const timezone = "Asia/Kolkata";
  const today = todayInZone(timezone);
  const trialEndsAt = input.trialDays > 0 ? addDays(today, input.trialDays) : null;
  const amount = input.billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;

  // `interactiveTransaction` keeps the tenant atomic — see note above.
  const gym = await db.$transaction(async (tx) => {
    const created = await tx.gym.create({
      data: {
        slug,
        name: input.name,
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        city: input.city ?? null,
        state: input.state ?? null,
        timezone,
        status: input.trialDays > 0 ? "TRIAL" : "ACTIVE",
        trialEndsAt,
        saasPlanId: plan.id,
        waProvider: "sandbox",
        waConnected: true, // sandbox needs no credentials
        waSenderDisplay: input.name,
      },
    });

    await tx.staffUser.create({
      data: {
        gymId: created.id,
        name: input.ownerName,
        email: input.email,
        passwordHash,
        phone: input.phone,
        role: "OWNER",
      },
    });

    await tx.membershipPlan.createMany({
      data: DEFAULT_MEMBERSHIP_PLANS.map((p) => ({
        gymId: created.id,
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        joiningFee: p.joiningFee,
        description: p.description,
        sortOrder: p.sortOrder,
      })),
    });

    await tx.waTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        gymId: created.id,
        key: t.key,
        name: t.name,
        category: t.category,
        body: t.body,
        isSystem: true,
      })),
    });

    // Wire automations to the templates that declare a default rule.
    const ruleSeeds = DEFAULT_TEMPLATES.filter((t) => t.defaultRule && t.trigger);
    await tx.reminderRule.createMany({
      data: ruleSeeds.map((t) => ({
        gymId: created.id,
        name: t.name,
        trigger: t.trigger as Trigger,
        offsetDays: t.defaultOffset ?? 0,
        templateKey: t.key,
        enabled: true,
      })),
    });

    const periodEnd =
      input.billingCycle === "YEARLY" ? addDays(today, 365) : addDays(today, 30);

    await tx.subscription.create({
      data: {
        gymId: created.id,
        planId: plan.id,
        status: input.trialDays > 0 ? "TRIALING" : "ACTIVE",
        billingCycle: input.billingCycle,
        amount,
        currentPeriodStart: today,
        currentPeriodEnd: trialEndsAt ?? periodEnd,
      },
    });

    await tx.auditLog.create({
      data: {
        gymId: created.id,
        actorType: input.provisionedBy ? "PLATFORM" : "SYSTEM",
        actorId: input.provisionedBy?.id ?? null,
        actorName: input.provisionedBy?.name ?? "system",
        action: "gym.provisioned",
        entity: "Gym",
        entityId: created.id,
        metaJson: JSON.stringify({
          plan: plan.key,
          billingCycle: input.billingCycle,
          trialDays: input.trialDays,
          templates: DEFAULT_TEMPLATES.length,
          rules: ruleSeeds.length,
        }),
      },
    });

    return created;
  });

  return gym;
}

/** Human summary of a rule, e.g. "7 days before membership expires". */
export function describeRule(trigger: string, offsetDays: number): string {
  const label = TRIGGER_LABELS[trigger as Trigger] ?? trigger;
  if (trigger === "BEFORE_EXPIRY") return `${offsetDays} days before expiry`;
  if (trigger === "AFTER_EXPIRY") return `${offsetDays} days after expiry`;
  if (trigger === "WELCOME") return offsetDays === 0 ? "On the day they join" : `${offsetDays} days after joining`;
  if (trigger === "INACTIVITY") return `After ${offsetDays} days without a check-in`;
  if (trigger === "DUES_PENDING") return `${offsetDays} days after a balance appears`;
  return label;
}
