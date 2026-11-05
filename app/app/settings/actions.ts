"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashPassword, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/whatsapp";
import {
  fieldErrors,
  gymProfileSchema,
  membershipPlanSchema,
  staffSchema,
  waConnectionSchema,
  type FormState,
} from "@/lib/validation";

/** Settings are owner/manager territory; front desk has no business here. */
const MANAGERS = ["OWNER", "MANAGER"] as const;

export async function saveGymProfile(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireRole(MANAGERS);

  const parsed = gymProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  await db.gym.update({
    where: { id: gym.id },
    data: {
      name: d.name,
      ownerName: d.ownerName,
      phone: d.phone,
      addressLine: d.addressLine ?? null,
      city: d.city ?? null,
      state: d.state ?? null,
      pincode: d.pincode ?? null,
      gstin: d.gstin ?? null,
      upiId: d.upiId ?? null,
      timezone: d.timezone,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "gym.profile_updated",
  });

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true, message: "Gym details saved." };
}

// ── Membership plans ────────────────────────────────────────────────────────

export async function savePlan(
  planId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireRole(MANAGERS);

  const parsed = membershipPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const clash = await db.membershipPlan.findFirst({
    where: { gymId: gym.id, name: d.name, ...(planId ? { id: { not: planId } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { name: "A plan with this name already exists." } };

  if (planId) {
    const existing = await db.membershipPlan.findFirst({
      where: { id: planId, gymId: gym.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, errors: { _form: "Plan not found." } };

    // Editing a plan never rewrites history: Membership rows snapshot the
    // name and price at the time of sale.
    await db.membershipPlan.update({
      where: { id: planId },
      data: {
        name: d.name,
        durationDays: d.durationDays,
        price: d.price,
        joiningFee: d.joiningFee,
        description: d.description ?? null,
        active: d.active,
      },
    });
  } else {
    const count = await db.membershipPlan.count({ where: { gymId: gym.id } });
    await db.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: d.name,
        durationDays: d.durationDays,
        price: d.price,
        joiningFee: d.joiningFee,
        description: d.description ?? null,
        active: d.active,
        sortOrder: count + 1,
      },
    });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: planId ? "plan.updated" : "plan.created",
    entity: "MembershipPlan",
    entityId: planId,
    meta: { name: d.name, price: d.price },
  });

  revalidatePath("/app/settings/plans");
  return { ok: true, message: planId ? "Plan updated." : "Plan created." };
}

export async function togglePlan(formData: FormData) {
  const { gym } = await requireRole(MANAGERS);
  const planId = String(formData.get("planId") ?? "");

  const plan = await db.membershipPlan.findFirst({
    where: { id: planId, gymId: gym.id },
    select: { id: true, active: true },
  });
  if (!plan) return;

  await db.membershipPlan.update({
    where: { id: plan.id },
    data: { active: !plan.active },
  });
  revalidatePath("/app/settings/plans");
}

export async function deletePlan(formData: FormData) {
  const { gym, staff } = await requireRole(MANAGERS);
  const planId = String(formData.get("planId") ?? "");

  const plan = await db.membershipPlan.findFirst({
    where: { id: planId, gymId: gym.id },
    select: { id: true, name: true, _count: { select: { memberships: true } } },
  });
  if (!plan) return;

  // A plan that has been sold is deactivated, not deleted — removing it would
  // orphan the memberships that reference it.
  if (plan._count.memberships > 0) {
    await db.membershipPlan.update({ where: { id: plan.id }, data: { active: false } });
  } else {
    await db.membershipPlan.delete({ where: { id: plan.id } });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: plan._count.memberships > 0 ? "plan.archived" : "plan.deleted",
    entity: "MembershipPlan",
    entityId: plan.id,
    meta: { name: plan.name, soldCount: plan._count.memberships },
  });

  revalidatePath("/app/settings/plans");
}

// ── Staff ───────────────────────────────────────────────────────────────────

export async function saveStaff(
  staffId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff: actor } = await requireRole(["OWNER"]);

  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const clash = await db.staffUser.findFirst({
    where: { gymId: gym.id, email: d.email, ...(staffId ? { id: { not: staffId } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { email: "Someone already uses this email." } };

  if (staffId) {
    const existing = await db.staffUser.findFirst({
      where: { id: staffId, gymId: gym.id },
      select: { id: true, role: true },
    });
    if (!existing) return { ok: false, errors: { _form: "Staff member not found." } };

    // The gym must always retain at least one owner, or nobody can manage it.
    if (existing.role === "OWNER" && d.role !== "OWNER") {
      const owners = await db.staffUser.count({
        where: { gymId: gym.id, role: "OWNER", active: true },
      });
      if (owners <= 1) {
        return { ok: false, errors: { role: "You need at least one owner on the account." } };
      }
    }

    await db.staffUser.update({
      where: { id: staffId },
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone ?? null,
        role: d.role,
        ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}),
      },
    });
  } else {
    if (!d.password) {
      return { ok: false, errors: { password: "Set a password for the new login." } };
    }

    if (gym.saasPlan) {
      const current = await db.staffUser.count({ where: { gymId: gym.id, active: true } });
      if (current >= gym.saasPlan.staffLimit) {
        return {
          ok: false,
          errors: {
            _form: `Your ${gym.saasPlan.name} plan allows ${gym.saasPlan.staffLimit} staff logins. Upgrade to add more.`,
          },
        };
      }
    }

    await db.staffUser.create({
      data: {
        gymId: gym.id,
        name: d.name,
        email: d.email,
        phone: d.phone ?? null,
        role: d.role,
        passwordHash: await hashPassword(d.password),
      },
    });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: actor.id,
    actorName: actor.name,
    action: staffId ? "staff.updated" : "staff.created",
    entity: "StaffUser",
    entityId: staffId,
    meta: { email: d.email, role: d.role },
  });

  revalidatePath("/app/settings/staff");
  return { ok: true, message: staffId ? "Staff member updated." : "Staff login created." };
}

export async function toggleStaff(formData: FormData) {
  const { gym, staff: actor } = await requireRole(["OWNER"]);
  const staffId = String(formData.get("staffId") ?? "");

  const target = await db.staffUser.findFirst({
    where: { id: staffId, gymId: gym.id },
    select: { id: true, active: true, role: true },
  });
  if (!target) return;

  // Deactivating yourself would lock you out mid-session.
  if (target.id === actor.id) return;

  if (target.active && target.role === "OWNER") {
    const owners = await db.staffUser.count({
      where: { gymId: gym.id, role: "OWNER", active: true },
    });
    if (owners <= 1) return;
  }

  await db.staffUser.update({
    where: { id: target.id },
    data: { active: !target.active },
  });
  revalidatePath("/app/settings/staff");
}

// ── WhatsApp connection ─────────────────────────────────────────────────────

export async function saveWaConnection(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireRole(MANAGERS);

  const parsed = waConnectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const provider = getProvider(d.waProvider);
  const creds = {
    provider: d.waProvider,
    phoneNumberId: d.waPhoneNumberId ?? null,
    businessId: d.waBusinessId ?? null,
    // An empty token field means "leave it alone", not "delete it" — otherwise
    // saving an unrelated setting would silently disconnect WhatsApp.
    accessToken: d.waAccessToken ?? gym.waAccessToken,
    apiKey: d.waApiKey ?? gym.waApiKey,
    senderDisplay: d.waSenderDisplay ?? null,
  };
  const configured = provider.isConfigured(creds);

  await db.gym.update({
    where: { id: gym.id },
    data: {
      waProvider: d.waProvider,
      waSenderDisplay: d.waSenderDisplay ?? null,
      waPhoneNumberId: d.waPhoneNumberId ?? null,
      waBusinessId: d.waBusinessId ?? null,
      waAccessToken: creds.accessToken,
      waApiKey: creds.apiKey,
      waConnected: configured,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "gym.whatsapp_updated",
    meta: { provider: d.waProvider, connected: configured },
  });

  revalidatePath("/app/settings/whatsapp");
  revalidatePath("/app");

  return configured
    ? { ok: true, message: `Connected to ${provider.label}. Reminders will be delivered.` }
    : {
        ok: false,
        errors: {
          _form: `${provider.label} still needs credentials. Reminders will be logged but not delivered until it's complete.`,
        },
      };
}

/** Sends a test message to the owner's own number. */
export async function sendWaTest(): Promise<FormState> {
  const { gym, staff } = await requireRole(MANAGERS);
  const { sendViaGym } = await import("@/lib/whatsapp");

  const body = `✅ Astryx test message\n\nYour WhatsApp connection for *${gym.name}* is working. Renewal reminders will be delivered from this number.\n\n— Astryx`;

  const result = await sendViaGym(gym, { to: gym.phone, body, templateKey: "astryx_test" });

  await db.messageLog.create({
    data: {
      gymId: gym.id,
      toPhone: gym.phone,
      body,
      kind: "MANUAL",
      templateKey: "astryx_test",
      status: result.ok ? "SENT" : "FAILED",
      provider: gym.waProvider,
      providerMessageId: result.providerMessageId ?? null,
      error: result.error ?? null,
      attempts: 1,
      scheduledFor: new Date(),
      sentAt: result.ok ? new Date() : null,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "gym.whatsapp_test",
    meta: { ok: result.ok, error: result.error },
  });

  revalidatePath("/app/outbox");

  return result.ok
    ? { ok: true, message: `Test message sent to ${gym.phone}. Check that handset.` }
    : { ok: false, errors: { _form: result.error ?? "Test failed." } };
}
