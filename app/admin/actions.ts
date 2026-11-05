"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createStaffSession, requirePlatform, requireSuperadmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { runEngine } from "@/lib/engine";
import { provisionGym } from "@/lib/provisioning";
import { addDays, todayInZone } from "@/lib/dates";
import {
  fieldErrors,
  provisionGymSchema,
  saasPlanSchema,
  templateSchema,
  type FormState,
} from "@/lib/validation";

/**
 * Platform-side actions.
 *
 * SUPPORT can read every screen but may not mutate tenants or billing —
 * hence `requireSuperadmin()` on everything that writes. Every action here
 * is recorded in the audit log against the admin who ran it, because these
 * operations reach into customers' accounts.
 */

export async function createGym(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireSuperadmin();

  const parsed = provisionGymSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  try {
    const gym = await provisionGym({
      name: d.name,
      ownerName: d.ownerName,
      email: d.email,
      phone: d.phone,
      city: d.city,
      state: d.state,
      planKey: d.planKey,
      billingCycle: d.billingCycle,
      trialDays: d.trialDays,
      password: d.password,
      provisionedBy: { id: user.id, name: user.name },
    });

    revalidatePath("/admin/gyms");
    revalidatePath("/admin");
    redirect(`/admin/gyms/${gym.id}?created=1`);
  } catch (err) {
    // `redirect()` throws a control-flow signal — never swallow it.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    return {
      ok: false,
      errors: { _form: err instanceof Error ? err.message : "Could not create the gym." },
    };
  }
}

export async function setGymStatus(formData: FormData) {
  const { user } = await requireSuperadmin();
  const gymId = String(formData.get("gymId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"].includes(status)) return;

  const gym = await db.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true } });
  if (!gym) return;

  await db.gym.update({ where: { id: gym.id }, data: { status } });
  await db.subscription.updateMany({
    where: { gymId: gym.id },
    data: {
      status:
        status === "ACTIVE"
          ? "ACTIVE"
          : status === "TRIAL"
            ? "TRIALING"
            : status === "PAST_DUE"
              ? "PAST_DUE"
              : "CANCELLED",
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.gym_status_changed",
    entity: "Gym",
    entityId: gym.id,
    meta: { status, gymName: gym.name },
  });

  revalidatePath(`/admin/gyms/${gym.id}`);
  revalidatePath("/admin/gyms");
}

export async function changeGymPlan(formData: FormData) {
  const { user } = await requireSuperadmin();
  const gymId = String(formData.get("gymId") ?? "");
  const planKey = String(formData.get("planKey") ?? "");
  const billingCycle = String(formData.get("billingCycle") ?? "MONTHLY");

  const [gym, plan] = await Promise.all([
    db.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, timezone: true } }),
    db.saasPlan.findUnique({ where: { key: planKey } }),
  ]);
  if (!gym || !plan) return;

  const amount = billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  const today = todayInZone(gym.timezone);

  await db.gym.update({ where: { id: gym.id }, data: { saasPlanId: plan.id } });

  const existing = await db.subscription.findFirst({
    where: { gymId: gym.id },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: { planId: plan.id, billingCycle, amount },
    });
  } else {
    await db.subscription.create({
      data: {
        gymId: gym.id,
        planId: plan.id,
        status: "ACTIVE",
        billingCycle,
        amount,
        currentPeriodStart: today,
        currentPeriodEnd: addDays(today, billingCycle === "YEARLY" ? 365 : 30),
      },
    });
  }

  await audit({
    gymId: gym.id,
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.gym_plan_changed",
    entity: "Gym",
    entityId: gym.id,
    meta: { planKey, billingCycle, amount },
  });

  revalidatePath(`/admin/gyms/${gym.id}`);
  revalidatePath("/admin/billing");
}

export async function extendTrial(formData: FormData) {
  const { user } = await requireSuperadmin();
  const gymId = String(formData.get("gymId") ?? "");
  const days = Math.max(1, Math.min(90, Number(formData.get("days") ?? 14) || 14));

  const gym = await db.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, trialEndsAt: true, timezone: true },
  });
  if (!gym) return;

  const base = gym.trialEndsAt && gym.trialEndsAt > new Date()
    ? gym.trialEndsAt
    : todayInZone(gym.timezone);

  await db.gym.update({
    where: { id: gym.id },
    data: { status: "TRIAL", trialEndsAt: addDays(base, days) },
  });

  await audit({
    gymId: gym.id,
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.trial_extended",
    entity: "Gym",
    entityId: gym.id,
    meta: { days },
  });

  revalidatePath(`/admin/gyms/${gym.id}`);
}

/**
 * Opens a tenant's dashboard as its owner, for support.
 *
 * The minted session carries `impersonatedBy`, which the gym layout renders
 * as a permanent banner — so there is never any doubt, for the admin or for
 * anyone reading the audit log, about who was actually driving.
 */
export async function impersonateGym(formData: FormData) {
  const { user } = await requirePlatform();
  const gymId = String(formData.get("gymId") ?? "");

  const owner = await db.staffUser.findFirst({
    where: { gymId, role: "OWNER", active: true },
    orderBy: { createdAt: "asc" },
    include: { gym: { select: { id: true, name: true } } },
  });
  if (!owner) redirect(`/admin/gyms/${gymId}?error=noowner`);

  await createStaffSession({
    staffId: owner.id,
    gymId: owner.gymId,
    role: owner.role as "OWNER",
    name: owner.name,
    email: owner.email,
    impersonatedBy: user.id,
    impersonatorName: user.name,
  });

  await audit({
    gymId: owner.gymId,
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.impersonated",
    entity: "Gym",
    entityId: owner.gymId,
    meta: { gymName: owner.gym.name, asStaff: owner.email },
  });

  redirect("/app");
}

export async function markInvoicePaid(formData: FormData) {
  const { user } = await requireSuperadmin();
  const invoiceId = String(formData.get("invoiceId") ?? "");

  const invoice = await db.saasInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, gymId: true, number: true, total: true },
  });
  if (!invoice) return;

  await db.saasInvoice.update({
    where: { id: invoice.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  // Clearing the overdue invoice should also clear the dunning state.
  const stillOverdue = await db.saasInvoice.count({
    where: { gymId: invoice.gymId, status: { in: ["OVERDUE", "DUE"] } },
  });
  if (stillOverdue === 0) {
    await db.gym.updateMany({
      where: { id: invoice.gymId, status: "PAST_DUE" },
      data: { status: "ACTIVE" },
    });
    await db.subscription.updateMany({
      where: { gymId: invoice.gymId, status: "PAST_DUE" },
      data: { status: "ACTIVE" },
    });
  }

  await audit({
    gymId: invoice.gymId,
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.invoice_marked_paid",
    entity: "SaasInvoice",
    entityId: invoice.id,
    meta: { number: invoice.number, total: invoice.total },
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/gyms/${invoice.gymId}`);
}

// ── SaaS plan catalogue ─────────────────────────────────────────────────────

export async function saveSaasPlan(
  planId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireSuperadmin();

  const parsed = saasPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const features = d.features
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const clash = await db.saasPlan.findFirst({
    where: { key: d.key, ...(planId ? { id: { not: planId } } : {}) },
    select: { name: true },
  });
  if (clash) return { ok: false, errors: { key: `"${clash.name}" already uses this key.` } };

  const data = {
    key: d.key,
    name: d.name,
    tagline: d.tagline ?? null,
    priceMonthly: d.priceMonthly,
    priceYearly: d.priceYearly,
    memberLimit: d.memberLimit,
    staffLimit: d.staffLimit,
    waMessageLimit: d.waMessageLimit,
    featuresJson: JSON.stringify(features),
    active: d.active,
  };

  if (planId) {
    await db.saasPlan.update({ where: { id: planId }, data });
  } else {
    const count = await db.saasPlan.count();
    await db.saasPlan.create({ data: { ...data, sortOrder: count + 1 } });
  }

  await audit({
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: planId ? "admin.saas_plan_updated" : "admin.saas_plan_created",
    entity: "SaasPlan",
    entityId: planId,
    meta: { key: d.key },
  });

  revalidatePath("/admin/plans");
  return { ok: true, message: planId ? "Plan updated." : "Plan created." };
}

export async function toggleSaasPlan(formData: FormData) {
  await requireSuperadmin();
  const planId = String(formData.get("planId") ?? "");

  const plan = await db.saasPlan.findUnique({
    where: { id: planId },
    select: { id: true, active: true },
  });
  if (!plan) return;

  await db.saasPlan.update({ where: { id: plan.id }, data: { active: !plan.active } });
  revalidatePath("/admin/plans");
}

// ── Global template library ─────────────────────────────────────────────────

export async function saveSystemTemplate(
  templateId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireSuperadmin();

  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const { unknownVars } = await import("@/lib/templates");
  const bad = unknownVars(d.body);
  if (bad.length > 0) {
    return {
      ok: false,
      errors: { body: `Unknown placeholders: ${bad.map((b) => `{{${b}}}`).join(", ")}` },
    };
  }

  if (templateId) {
    await db.systemTemplate.update({
      where: { id: templateId },
      data: { name: d.name, category: d.category, body: d.body },
    });
  } else {
    const clash = await db.systemTemplate.findUnique({ where: { key: d.key } });
    if (clash) return { ok: false, errors: { key: "That key is already in the library." } };
    await db.systemTemplate.create({
      data: { key: d.key, name: d.name, category: d.category, body: d.body },
    });
  }

  await audit({
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: templateId ? "admin.system_template_updated" : "admin.system_template_created",
    entity: "SystemTemplate",
    entityId: templateId,
    meta: { key: d.key },
  });

  revalidatePath("/admin/templates");
  return {
    ok: true,
    message: "Saved. New gyms get this copy; existing gyms keep their own edits.",
  };
}

/**
 * Pushes a library template to every tenant that hasn't customised it.
 *
 * Gyms that edited their copy are left alone — silently overwriting an
 * owner's own wording would be a betrayal of the one thing they control.
 */
export async function pushTemplateToTenants(formData: FormData) {
  const { user } = await requireSuperadmin();
  const templateId = String(formData.get("templateId") ?? "");

  const system = await db.systemTemplate.findUnique({ where: { id: templateId } });
  if (!system) return;

  const originals = await db.systemTemplate.findMany({ select: { key: true, body: true } });
  const originalBody = originals.find((o) => o.key === system.key)?.body;

  const candidates = await db.waTemplate.findMany({
    where: { key: system.key },
    select: { id: true, body: true, gymId: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const t of candidates) {
    // "Uncustomised" means the body still matches what we shipped.
    if (originalBody !== undefined && t.body !== originalBody) {
      skipped++;
      continue;
    }
    await db.waTemplate.update({
      where: { id: t.id },
      data: { body: system.body, name: system.name, category: system.category },
    });
    updated++;
  }

  await audit({
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.template_pushed",
    entity: "SystemTemplate",
    entityId: system.id,
    meta: { key: system.key, updated, skippedCustomised: skipped },
  });

  revalidatePath("/admin/templates");
}

/** Runs the engine across every tenant, from the admin console. */
export async function runEngineAllTenants(): Promise<FormState> {
  const { user } = await requireSuperadmin();

  const result = await runEngine({ trigger: "MANUAL" });

  await audit({
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.engine_run",
    meta: {
      gyms: result.gymsProcessed,
      queued: result.queued,
      sent: result.sent,
      failed: result.failed,
    },
  });

  revalidatePath("/admin/engine");
  revalidatePath("/admin");

  return {
    ok: true,
    message: `${result.gymsProcessed} gyms · ${result.sent} sent · ${result.queued} queued · ${result.skipped} skipped · ${result.failed} failed`,
  };
}
