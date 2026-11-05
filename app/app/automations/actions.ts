"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { runEngine } from "@/lib/engine";
import {
  automationSettingsSchema,
  fieldErrors,
  ruleSchema,
  type FormState,
} from "@/lib/validation";

/** Enable/disable a single automation. The most-used control on the page. */
export async function toggleRule(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const ruleId = String(formData.get("ruleId") ?? "");

  const rule = await db.reminderRule.findFirst({
    where: { id: ruleId, gymId: gym.id },
    select: { id: true, enabled: true, name: true },
  });
  if (!rule) return;

  await db.reminderRule.update({
    where: { id: rule.id },
    data: { enabled: !rule.enabled },
  });
  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: rule.enabled ? "rule.disabled" : "rule.enabled",
    entity: "ReminderRule",
    entityId: rule.id,
    meta: { name: rule.name },
  });

  revalidatePath("/app/automations");
  revalidatePath("/app");
}

export async function saveRule(
  ruleId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const template = await db.waTemplate.findFirst({
    where: { gymId: gym.id, key: d.templateKey },
    select: { key: true },
  });
  if (!template) return { ok: false, errors: { templateKey: "That template doesn't exist." } };

  // (trigger, offsetDays) is unique per gym: two rules firing on the same day
  // for the same event would double-message every member.
  const clash = await db.reminderRule.findFirst({
    where: {
      gymId: gym.id,
      trigger: d.trigger,
      offsetDays: d.offsetDays,
      ...(ruleId ? { id: { not: ruleId } } : {}),
    },
    select: { name: true },
  });
  if (clash) {
    return {
      ok: false,
      errors: {
        offsetDays: `"${clash.name}" already fires on this trigger and day. Change the day or edit that rule.`,
      },
    };
  }

  if (ruleId) {
    const existing = await db.reminderRule.findFirst({
      where: { id: ruleId, gymId: gym.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, errors: { _form: "Automation not found." } };

    await db.reminderRule.update({
      where: { id: ruleId },
      data: {
        name: d.name,
        trigger: d.trigger,
        offsetDays: d.offsetDays,
        templateKey: d.templateKey,
        enabled: d.enabled,
        sendHour: d.sendHour ?? null,
      },
    });
  } else {
    await db.reminderRule.create({
      data: {
        gymId: gym.id,
        name: d.name,
        trigger: d.trigger,
        offsetDays: d.offsetDays,
        templateKey: d.templateKey,
        enabled: d.enabled,
        sendHour: d.sendHour ?? null,
      },
    });
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: ruleId ? "rule.updated" : "rule.created",
    entity: "ReminderRule",
    entityId: ruleId,
    meta: { name: d.name, trigger: d.trigger, offsetDays: d.offsetDays },
  });

  revalidatePath("/app/automations");
  return { ok: true, message: ruleId ? "Automation updated." : "Automation created." };
}

export async function deleteRule(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const ruleId = String(formData.get("ruleId") ?? "");

  const rule = await db.reminderRule.findFirst({
    where: { id: ruleId, gymId: gym.id },
    select: { id: true, name: true },
  });
  if (!rule) return;

  await db.reminderRule.delete({ where: { id: rule.id } });
  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "rule.deleted",
    entity: "ReminderRule",
    entityId: rule.id,
    meta: { name: rule.name },
  });

  revalidatePath("/app/automations");
}

export async function saveAutomationSettings(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = automationSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  await db.gym.update({
    where: { id: gym.id },
    data: {
      autoRemindersEnabled: d.autoRemindersEnabled,
      reminderSendHour: d.reminderSendHour,
      quietHoursStart: d.quietHoursStart,
      quietHoursEnd: d.quietHoursEnd,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "automations.settings_updated",
    meta: d,
  });

  revalidatePath("/app/automations");
  revalidatePath("/app");
  return {
    ok: true,
    message: d.autoRemindersEnabled
      ? "Settings saved. Automations are running."
      : "Settings saved. Automations are paused — nothing will be sent.",
  };
}

/**
 * Runs the engine for this tenant only, on demand.
 *
 * Gives an owner a way to see the automation work immediately instead of
 * waiting for the nightly cron — which is the difference between trusting
 * the feature and assuming it's broken.
 */
export async function runEngineForGym(): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const result = await runEngine({ gymId: gym.id, trigger: "MANUAL" });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "engine.manual_run",
    meta: { queued: result.queued, sent: result.sent, skipped: result.skipped, failed: result.failed },
  });

  revalidatePath("/app/automations");
  revalidatePath("/app/outbox");
  revalidatePath("/app");

  const parts = [
    `${result.sent} sent`,
    `${result.queued} queued`,
    result.skipped > 0 ? `${result.skipped} skipped` : null,
    result.failed > 0 ? `${result.failed} failed` : null,
  ].filter(Boolean);

  return {
    ok: true,
    message:
      result.queued === 0 && result.sent === 0
        ? "Nothing to send right now — no members match your rules today."
        : `Done: ${parts.join(", ")}.`,
  };
}
