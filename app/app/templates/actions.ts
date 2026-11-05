"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { unknownVars } from "@/lib/templates";
import { fieldErrors, templateSchema, type FormState } from "@/lib/validation";

export async function saveTemplate(
  templateId: string | null,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();

  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  // A typo'd placeholder reaches members as literal "{{frist_name}}" text, so
  // it's rejected rather than warned about.
  const bad = unknownVars(d.body);
  if (bad.length > 0) {
    return {
      ok: false,
      errors: {
        body: `Unknown placeholder${bad.length > 1 ? "s" : ""}: ${bad
          .map((b) => `{{${b}}}`)
          .join(", ")}. Use the variable list beside the editor.`,
      },
    };
  }

  if (templateId) {
    const existing = await db.waTemplate.findFirst({
      where: { id: templateId, gymId: gym.id },
      select: { id: true, key: true, isSystem: true },
    });
    if (!existing) return { ok: false, errors: { _form: "Template not found." } };

    await db.waTemplate.update({
      where: { id: templateId },
      data: {
        // System template keys are referenced by rules — renaming the key
        // would silently detach the automation.
        key: existing.isSystem ? existing.key : d.key,
        name: d.name,
        category: d.category,
        body: d.body,
        active: d.active,
      },
    });

    await audit({
      gymId: gym.id,
      actorType: "STAFF",
      actorId: staff.id,
      actorName: staff.name,
      action: "template.updated",
      entity: "WaTemplate",
      entityId: templateId,
      meta: { key: existing.key },
    });

    revalidatePath("/app/templates");
    revalidatePath(`/app/templates/${templateId}`);
    return { ok: true, message: "Template saved. Future messages use the new wording." };
  }

  const clash = await db.waTemplate.findFirst({
    where: { gymId: gym.id, key: d.key },
    select: { name: true },
  });
  if (clash) {
    return { ok: false, errors: { key: `"${clash.name}" already uses this key.` } };
  }

  const created = await db.waTemplate.create({
    data: {
      gymId: gym.id,
      key: d.key,
      name: d.name,
      category: d.category,
      body: d.body,
      active: d.active,
      isSystem: false,
    },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "template.created",
    entity: "WaTemplate",
    entityId: created.id,
    meta: { key: d.key },
  });

  revalidatePath("/app/templates");
  redirect(`/app/templates/${created.id}?created=1`);
}

export async function deleteTemplate(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const templateId = String(formData.get("templateId") ?? "");

  const template = await db.waTemplate.findFirst({
    where: { id: templateId, gymId: gym.id },
    select: { id: true, key: true, isSystem: true, name: true },
  });
  if (!template || template.isSystem) return;

  // Refuse while an automation still points at it, rather than leaving a rule
  // that silently stops firing.
  const inUse = await db.reminderRule.count({
    where: { gymId: gym.id, templateKey: template.key },
  });
  if (inUse > 0) {
    redirect(`/app/templates/${templateId}?error=inuse`);
  }

  await db.waTemplate.delete({ where: { id: template.id } });
  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "template.deleted",
    entity: "WaTemplate",
    entityId: template.id,
    meta: { key: template.key, name: template.name },
  });

  revalidatePath("/app/templates");
  redirect("/app/templates?deleted=1");
}

/** Restores a system template's original Astryx wording. */
export async function resetTemplate(formData: FormData) {
  const { gym, staff } = await requireStaff();
  const templateId = String(formData.get("templateId") ?? "");

  const template = await db.waTemplate.findFirst({
    where: { id: templateId, gymId: gym.id },
    select: { id: true, key: true, isSystem: true },
  });
  if (!template || !template.isSystem) return;

  const original = await db.systemTemplate.findUnique({ where: { key: template.key } });
  if (!original) return;

  await db.waTemplate.update({
    where: { id: template.id },
    data: { body: original.body, name: original.name, category: original.category },
  });

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "template.reset",
    entity: "WaTemplate",
    entityId: template.id,
  });

  revalidatePath(`/app/templates/${templateId}`);
}
