"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkInMember } from "@/lib/members";
import { normalizePhone } from "@/lib/phone";
import { todayInZone } from "@/lib/dates";
import type { FormState } from "@/lib/validation";

/**
 * Front-desk check-in by member code or phone number.
 *
 * Tolerant lookup on purpose: staff type "42", "MBR-0042", "9876543210" or
 * a name fragment, and all of them should work on the first try — this is
 * used while a member is standing there waiting.
 */
export async function checkInByLookup(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const { gym, staff } = await requireStaff();
  const raw = String(formData.get("lookup") ?? "").trim();

  if (!raw) return { ok: false, errors: { lookup: "Enter a member ID, phone or name." } };

  const padded = /^\d+$/.test(raw) ? `MBR-${raw.padStart(4, "0")}` : null;
  const phone = normalizePhone(raw);

  const candidates = await db.member.findMany({
    where: {
      gymId: gym.id,
      status: { not: "CANCELLED" },
      OR: [
        { code: raw.toUpperCase() },
        ...(padded ? [{ code: padded }] : []),
        ...(phone.length > 5 ? [{ phone }] : []),
        { phone: { contains: raw.replace(/\D/g, "") || "\u0000" } },
        { name: { contains: raw } },
      ],
    },
    select: { id: true, name: true, code: true, status: true, expiryDate: true },
    take: 5,
  });

  if (candidates.length === 0) {
    return { ok: false, errors: { lookup: `No member found for "${raw}".` } };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      errors: {
        lookup: `${candidates.length} members match "${raw}": ${candidates
          .map((c) => `${c.name} (${c.code})`)
          .join(", ")}. Use the member ID.`,
      },
    };
  }

  const member = candidates[0];
  await checkInMember(gym.id, member.id, "CODE", staff.id);

  revalidatePath("/app/attendance");
  revalidatePath("/app");

  // An expired member still gets checked in — the desk decides whether to let
  // them train. But say so loudly, because this is the renewal moment.
  const today = todayInZone(gym.timezone);
  if (member.expiryDate && member.expiryDate < today) {
    return {
      ok: true,
      message: `${member.name} (${member.code}) checked in — ⚠ their membership has EXPIRED. Ask them to renew.`,
    };
  }
  return { ok: true, message: `${member.name} (${member.code}) checked in.` };
}
