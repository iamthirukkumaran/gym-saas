"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendViaGym } from "@/lib/whatsapp";

/** Re-attempt one failed message immediately. */
export async function retryMessage(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const messageId = String(formData.get("messageId") ?? "");

  const msg = await db.messageLog.findFirst({
    where: { id: messageId, gymId: gym.id, status: { in: ["FAILED", "QUEUED"] } },
  });
  if (!msg) return;

  const result = await sendViaGym(gym, {
    to: msg.toPhone,
    body: msg.body,
    templateKey: msg.templateKey,
    templateName: msg.templateKey,
  });

  await db.messageLog.update({
    where: { id: msg.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      provider: gym.waProvider,
      providerMessageId: result.providerMessageId ?? null,
      error: result.error ?? null,
      costPaise: result.costPaise ?? msg.costPaise,
      // Reset the counter so a manual retry isn't blocked by earlier attempts.
      attempts: result.ok ? msg.attempts + 1 : 1,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "message.retried",
    entity: "MessageLog",
    entityId: msg.id,
    meta: { ok: result.ok, error: result.error },
  });

  revalidatePath("/app/outbox");
}

/** Pull a queued message before it goes out. */
export async function cancelQueued(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const messageId = String(formData.get("messageId") ?? "");

  const msg = await db.messageLog.findFirst({
    where: { id: messageId, gymId: gym.id, status: "QUEUED" },
    select: { id: true },
  });
  if (!msg) return;

  await db.messageLog.update({
    where: { id: msg.id },
    data: { status: "SKIPPED", skipReason: `Cancelled by ${staff.name}` },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "message.cancelled",
    entity: "MessageLog",
    entityId: msg.id,
  });

  revalidatePath("/app/outbox");
}

/** Retry every failed message from the last 7 days in one go. */
export async function retryAllFailed() {
  const { gym, staff } = await requireStaff();
  const cutoff = new Date(Date.now() - 7 * 86_400_000);

  const failed = await db.messageLog.findMany({
    where: { gymId: gym.id, status: "FAILED", createdAt: { gte: cutoff } },
    take: 100,
  });

  let ok = 0;
  for (const msg of failed) {
    const result = await sendViaGym(gym, {
      to: msg.toPhone,
      body: msg.body,
      templateKey: msg.templateKey,
      templateName: msg.templateKey,
    });
    await db.messageLog.update({
      where: { id: msg.id },
      data: {
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        provider: gym.waProvider,
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
        attempts: msg.attempts + 1,
      },
    });
    if (result.ok) ok++;
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "message.retry_all",
    meta: { attempted: failed.length, recovered: ok },
  });

  revalidatePath("/app/outbox");
}
