"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseDateInput, todayInZone } from "@/lib/dates";
import { nextMemberCode } from "@/lib/members";
import { fieldErrors, leadSchema, type FormState } from "@/lib/validation";

export async function createLead(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  // If this number is already a member, say so — chasing an existing member
  // as a new lead is embarrassing in front of them.
  const existing = await db.member.findFirst({
    where: { gymId: gym.id, phone: d.phone, status: { not: "CANCELLED" } },
    select: { name: true, code: true },
  });
  if (existing) {
    return {
      ok: false,
      errors: { phone: `${existing.name} (${existing.code}) is already a member on this number.` },
    };
  }

  const lead = await db.lead.create({
    data: {
      gymId: gym.id,
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      source: d.source ?? null,
      interest: d.interest ?? null,
      status: d.status,
      followUpAt: parseDateInput(d.followUpAt),
      notes: d.notes ?? null,
      assignedStaffId: staff.id,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "lead.created",
    entity: "Lead",
    entityId: lead.id,
    meta: { name: d.name, source: d.source },
  });

  revalidatePath("/app/enquiries");
  return { ok: true, message: `${d.name} added to your pipeline.` };
}

export async function setLeadStatus(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["NEW", "CONTACTED", "TRIAL", "WON", "LOST"].includes(status)) return;

  const lead = await db.lead.findFirst({
    where: { id: leadId, gymId: gym.id },
    select: { id: true, name: true },
  });
  if (!lead) return;

  await db.lead.update({
    where: { id: lead.id },
    data: {
      status,
      // Won and lost leads leave the follow-up queue.
      followUpAt: status === "WON" || status === "LOST" ? null : undefined,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "lead.status_changed",
    entity: "Lead",
    entityId: lead.id,
    meta: { status },
  });

  revalidatePath("/app/enquiries");
}

export async function snoozeLead(formData: FormData) {
  const { gym } = await requireStaff();
  const leadId = String(formData.get("leadId") ?? "");
  const days = Number(formData.get("days") ?? 2) || 2;

  const lead = await db.lead.findFirst({
    where: { id: leadId, gymId: gym.id },
    select: { id: true },
  });
  if (!lead) return;

  const today = todayInZone(gym.timezone);
  const next = new Date(today);
  next.setUTCDate(next.getUTCDate() + days);

  await db.lead.update({
    where: { id: lead.id },
    data: { followUpAt: next, status: "CONTACTED" },
  });
  revalidatePath("/app/enquiries");
}

/**
 * Converts a won lead into a member and sends the operator straight to plan
 * assignment — the step that actually makes the gym money.
 */
export async function convertLead(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const leadId = String(formData.get("leadId") ?? "");

  const lead = await db.lead.findFirst({ where: { id: leadId, gymId: gym.id } });
  if (!lead) return;

  if (lead.convertedMemberId) {
    redirect(`/app/members/${lead.convertedMemberId}`);
  }

  const existing = await db.member.findFirst({
    where: { gymId: gym.id, phone: lead.phone, status: { not: "CANCELLED" } },
    select: { id: true },
  });
  if (existing) {
    await db.lead.update({
      where: { id: lead.id },
      data: { status: "WON", convertedMemberId: existing.id, convertedAt: new Date() },
    });
    redirect(`/app/members/${existing.id}`);
  }

  const code = await nextMemberCode(gym.id);
  const member = await db.member.create({
    data: {
      gymId: gym.id,
      code,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      joinDate: todayInZone(gym.timezone),
      notes: lead.notes ? `From enquiry: ${lead.notes}` : null,
    },
  });

  await db.lead.update({
    where: { id: lead.id },
    data: {
      status: "WON",
      convertedMemberId: member.id,
      convertedAt: new Date(),
      followUpAt: null,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "lead.converted",
    entity: "Lead",
    entityId: lead.id,
    meta: { memberId: member.id, code },
  });

  revalidatePath("/app/enquiries");
  revalidatePath("/app/members");
  redirect(`/app/members/${member.id}/renew?new=1`);
}
