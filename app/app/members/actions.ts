"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseDateInput, todayInZone } from "@/lib/dates";
import {
  assignMembership,
  checkInMember,
  freezeMember,
  nextMemberCode,
  recomputeMember,
  recordPayment,
  unfreezeMember,
} from "@/lib/members";
import { render } from "@/lib/templates";
import { sendViaGym } from "@/lib/whatsapp";
import {
  assignPlanSchema,
  fieldErrors,
  memberSchema,
  paymentSchema,
  type FormState,
} from "@/lib/validation";

/**
 * All member mutations.
 *
 * Every action re-derives the tenant from the session rather than trusting a
 * gymId from the form, and every lookup is scoped by that gymId — so a
 * crafted request cannot reach another gym's member.
 */

export async function createMember(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  // Plan limit enforcement — the subscription has to mean something.
  if (gym.saasPlan && gym.saasPlan.memberLimit !== -1) {
    const current = await db.member.count({
      where: { gymId: gym.id, status: { not: "CANCELLED" } },
    });
    if (current >= gym.saasPlan.memberLimit) {
      return {
        ok: false,
        errors: {
          _form: `Your ${gym.saasPlan.name} plan allows ${gym.saasPlan.memberLimit} members. Upgrade to add more.`,
        },
      };
    }
  }

  // Duplicate phone numbers are the single most common data-quality problem
  // when a gym migrates off a spreadsheet, so it's blocked at the door.
  const clash = await db.member.findFirst({
    where: { gymId: gym.id, phone: d.phone, status: { not: "CANCELLED" } },
    select: { id: true, name: true, code: true },
  });
  if (clash) {
    return {
      ok: false,
      errors: {
        phone: `${clash.name} (${clash.code}) already uses this number.`,
      },
    };
  }

  const code = await nextMemberCode(gym.id);
  const member = await db.member.create({
    data: {
      gymId: gym.id,
      code,
      name: d.name,
      phone: d.phone,
      altPhone: d.altPhone ?? null,
      email: d.email ?? null,
      gender: d.gender ?? null,
      dob: parseDateInput(d.dob),
      joinDate: parseDateInput(d.joinDate) ?? todayInZone(gym.timezone),
      addressLine: d.addressLine ?? null,
      city: d.city ?? null,
      heightCm: typeof d.heightCm === "number" ? d.heightCm : null,
      weightKg: typeof d.weightKg === "number" ? d.weightKg : null,
      goal: d.goal ?? null,
      medicalNotes: d.medicalNotes ?? null,
      emergencyName: d.emergencyName ?? null,
      emergencyPhone: d.emergencyPhone ?? null,
      trainerId: d.trainerId ?? null,
      source: d.source ?? null,
      notes: d.notes ?? null,
      waOptOut: d.waOptOut,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "member.created",
    entity: "Member",
    entityId: member.id,
    meta: { code, name: d.name },
  });

  revalidatePath("/app/members");
  revalidatePath("/app");
  // Straight into plan assignment — a member with no plan is useless, and
  // this is the step owners most often forget.
  redirect(`/app/members/${member.id}/renew?new=1`);
}

export async function updateMember(
  memberId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const existing = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    select: { id: true, phone: true },
  });
  if (!existing) return { ok: false, errors: { _form: "Member not found." } };

  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  if (d.phone !== existing.phone) {
    const clash = await db.member.findFirst({
      where: { gymId: gym.id, phone: d.phone, id: { not: memberId }, status: { not: "CANCELLED" } },
      select: { name: true, code: true },
    });
    if (clash) {
      return { ok: false, errors: { phone: `${clash.name} (${clash.code}) already uses this number.` } };
    }
  }

  await db.member.update({
    where: { id: memberId },
    data: {
      name: d.name,
      phone: d.phone,
      altPhone: d.altPhone ?? null,
      email: d.email ?? null,
      gender: d.gender ?? null,
      dob: parseDateInput(d.dob),
      joinDate: parseDateInput(d.joinDate) ?? todayInZone(gym.timezone),
      addressLine: d.addressLine ?? null,
      city: d.city ?? null,
      heightCm: typeof d.heightCm === "number" ? d.heightCm : null,
      weightKg: typeof d.weightKg === "number" ? d.weightKg : null,
      goal: d.goal ?? null,
      medicalNotes: d.medicalNotes ?? null,
      emergencyName: d.emergencyName ?? null,
      emergencyPhone: d.emergencyPhone ?? null,
      trainerId: d.trainerId ?? null,
      source: d.source ?? null,
      notes: d.notes ?? null,
      waOptOut: d.waOptOut,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "member.updated",
    entity: "Member",
    entityId: memberId,
  });

  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/members");
  return { ok: true, message: "Member details saved." };
}

/** Assign or renew a plan, optionally collecting payment in the same step. */
export async function assignPlan(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = assignPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const member = await db.member.findFirst({
    where: { id: d.memberId, gymId: gym.id },
  });
  if (!member) return { ok: false, errors: { _form: "Member not found." } };

  let planName: string;
  let durationDays: number;
  let price: number;
  let joiningFee = 0;

  if (d.planId) {
    const plan = await db.membershipPlan.findFirst({
      where: { id: d.planId, gymId: gym.id },
    });
    if (!plan) return { ok: false, errors: { planId: "That plan no longer exists." } };
    planName = plan.name;
    durationDays = plan.durationDays;
    price = plan.price;
    // Joining fee applies to genuinely new members only, never on renewal.
    const hadMembership = await db.membership.count({ where: { memberId: member.id } });
    joiningFee = hadMembership === 0 ? plan.joiningFee : 0;
  } else {
    if (!d.customName || !d.customDurationDays || d.customPrice === undefined) {
      return {
        ok: false,
        errors: { planId: "Pick a plan, or fill in all three custom plan fields." },
      };
    }
    planName = d.customName;
    durationDays = d.customDurationDays;
    price = d.customPrice;
  }

  const startDate = parseDateInput(d.startDate) ?? todayInZone(gym.timezone);

  const membership = await assignMembership({
    gymId: gym.id,
    memberId: member.id,
    planId: d.planId ?? null,
    planName,
    durationDays,
    price,
    discount: d.discount,
    joiningFee,
    startDate,
    autoRenew: d.autoRenew,
    isRenewal: d.isRenewal,
    createdByStaffId: staff.id,
  });

  if (d.payNow > 0) {
    await recordPayment({
      gymId: gym.id,
      memberId: member.id,
      membershipId: membership.id,
      amount: d.payNow,
      mode: d.payMode,
      collectedByStaffId: staff.id,
    });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: d.isRenewal ? "membership.renewed" : "membership.assigned",
    entity: "Membership",
    entityId: membership.id,
    meta: { planName, durationDays, payable: membership.payable, paid: d.payNow },
  });

  revalidatePath(`/app/members/${member.id}`);
  revalidatePath("/app/members");
  revalidatePath("/app/renewals");
  revalidatePath("/app");
  redirect(`/app/members/${member.id}?saved=plan`);
}

export async function addPayment(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const member = await db.member.findFirst({
    where: { id: d.memberId, gymId: gym.id },
    select: { id: true },
  });
  if (!member) return { ok: false, errors: { _form: "Member not found." } };

  // A membershipId from the form is verified to belong to this gym *and*
  // this member before it's trusted.
  let membershipId: string | null = null;
  if (d.membershipId) {
    const ms = await db.membership.findFirst({
      where: { id: d.membershipId, gymId: gym.id, memberId: member.id },
      select: { id: true },
    });
    membershipId = ms?.id ?? null;
  }

  const payment = await recordPayment({
    gymId: gym.id,
    memberId: member.id,
    membershipId,
    amount: d.amount,
    mode: d.mode,
    paidAt: parseDateInput(d.paidAt) ?? new Date(),
    reference: d.reference ?? null,
    notes: d.notes ?? null,
    collectedByStaffId: staff.id,
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "payment.recorded",
    entity: "Payment",
    entityId: payment.id,
    meta: { amount: d.amount, mode: d.mode, invoiceNo: payment.invoiceNo },
  });

  revalidatePath(`/app/members/${member.id}`);
  revalidatePath("/app/payments");
  revalidatePath("/app");
  return { ok: true, message: `Payment recorded — invoice ${payment.invoiceNo}.` };
}

// ── Quick state changes (plain form posts, no validation payload) ───────────

export async function toggleFreeze(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const memberId = String(formData.get("memberId") ?? "");

  const member = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    select: { id: true, status: true },
  });
  if (!member) return;

  if (member.status === "FROZEN") {
    await unfreezeMember(gym.id, member.id);
  } else {
    await freezeMember(gym.id, member.id);
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: member.status === "FROZEN" ? "member.unfrozen" : "member.frozen",
    entity: "Member",
    entityId: member.id,
  });

  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/members");
}

export async function doCheckIn(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const memberId = String(formData.get("memberId") ?? "");

  const member = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    select: { id: true },
  });
  if (!member) return;

  await checkInMember(gym.id, member.id, "MANUAL", staff.id);
  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/attendance");
  revalidatePath("/app");
}

export async function toggleOptOut(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const memberId = String(formData.get("memberId") ?? "");

  const member = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    select: { id: true, waOptOut: true },
  });
  if (!member) return;

  await db.member.update({
    where: { id: member.id },
    data: { waOptOut: !member.waOptOut },
  });
  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: member.waOptOut ? "member.wa_opt_in" : "member.wa_opt_out",
    entity: "Member",
    entityId: member.id,
  });
  revalidatePath(`/app/members/${memberId}`);
}

export async function cancelMember(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const memberId = String(formData.get("memberId") ?? "");

  const member = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    select: { id: true },
  });
  if (!member) return;

  // Soft state change, never a delete: payment history is financial
  // record-keeping and has to survive.
  await db.member.update({ where: { id: member.id }, data: { status: "CANCELLED" } });
  await db.membership.updateMany({
    where: { memberId: member.id, status: { in: ["ACTIVE", "UPCOMING", "FROZEN"] } },
    data: { status: "CANCELLED" },
  });
  await recomputeMember(member.id);

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "member.cancelled",
    entity: "Member",
    entityId: member.id,
  });

  revalidatePath("/app/members");
  redirect("/app/members?cancelled=1");
}

/** Sends one template to one member, right now, outside the automations. */
export async function sendManualMessage(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const memberId = String(formData.get("memberId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "");

  const member = await db.member.findFirst({
    where: { id: memberId, gymId: gym.id },
    include: { trainer: { select: { name: true } } },
  });
  if (!member) return { ok: false, errors: { _form: "Member not found." } };
  if (member.waOptOut) {
    return { ok: false, errors: { _form: `${member.name} has opted out of WhatsApp messages.` } };
  }

  const template = await db.waTemplate.findFirst({
    where: { gymId: gym.id, key: templateKey, active: true },
  });
  if (!template) return { ok: false, errors: { templateKey: "Pick an active template." } };

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const body = render(template.body, {
    member,
    gym: { name: gym.name, phone: gym.phone, ownerName: gym.ownerName, timezone: gym.timezone, upiId: gym.upiId },
    extra: { renew_link: `${appUrl}/r/${member.id}` },
  });

  const result = await sendViaGym(gym, { to: member.phone, body, templateKey: template.key });

  await db.messageLog.create({
    data: {
      gymId: gym.id,
      memberId: member.id,
      toPhone: member.phone,
      templateKey: template.key,
      body,
      kind: "MANUAL",
      status: result.ok ? "SENT" : "FAILED",
      provider: gym.waProvider,
      providerMessageId: result.providerMessageId ?? null,
      error: result.error ?? null,
      costPaise: result.costPaise ?? 0,
      attempts: 1,
      scheduledFor: new Date(),
      sentAt: result.ok ? new Date() : null,
    },
  });

  if (result.ok) {
    await db.member.update({ where: { id: member.id }, data: { lastMessageAt: new Date() } });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "message.manual_sent",
    entity: "Member",
    entityId: member.id,
    meta: { templateKey, ok: result.ok, error: result.error },
  });

  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/outbox");

  return result.ok
    ? { ok: true, message: `Sent to ${member.name} on WhatsApp.` }
    : { ok: false, errors: { _form: result.error ?? "Message could not be sent." } };
}
