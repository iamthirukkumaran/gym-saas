"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { autoMapColumns, parseCsv, parseLooseDate, parseLooseMoney } from "@/lib/csv";
import { addDays, todayInZone, utcDay } from "@/lib/dates";
import { nextMemberCode, recomputeMember } from "@/lib/members";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export type ImportRow = {
  line: number;
  name: string;
  phone: string;
  planName: string;
  joinDate: Date | null;
  expiryDate: Date | null;
  amount: number;
  balance: number;
  email?: string;
  city?: string;
  notes?: string;
  problem?: string;
  duplicate?: boolean;
};

export type ImportResult = {
  ok: boolean;
  dryRun: boolean;
  headers: string[];
  mapping: Record<string, number>;
  rows: ImportRow[];
  imported: number;
  skipped: number;
  error?: string;
};

/**
 * Spreadsheet import.
 *
 * This is the single most important screen for winning a customer: almost
 * every small gym already has their members in Excel, and if moving that data
 * is painful they never start. So it:
 *
 *  - auto-detects columns by synonym (no manual mapping in the common case),
 *  - accepts dd/mm/yyyy, ISO and text dates,
 *  - always runs a dry run first, showing exactly what will happen per row,
 *  - reconstructs a membership from join + expiry dates, so expiry tracking
 *    and WhatsApp reminders work on imported members immediately,
 *  - flags duplicates against existing members instead of creating them twice.
 */
export async function importMembers(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const { gym, staff } = await requireStaff();

  const dryRun = formData.get("commit") !== "yes";
  const pasted = String(formData.get("csv") ?? "");
  const file = formData.get("file");

  let text = pasted;
  if (file instanceof File && file.size > 0) {
    text = await file.text();
  }

  const empty: ImportResult = {
    ok: false,
    dryRun,
    headers: [],
    mapping: {},
    rows: [],
    imported: 0,
    skipped: 0,
  };

  if (!text.trim()) {
    return { ...empty, error: "Paste your spreadsheet data or choose a CSV file." };
  }

  const parsed = parseCsv(text);
  if (parsed.length < 2) {
    return {
      ...empty,
      error: "That looks like only a header row. Include at least one member below it.",
    };
  }

  const headers = parsed[0];
  const mapping = autoMapColumns(headers);

  if (mapping.name === undefined || mapping.phone === undefined) {
    return {
      ...empty,
      headers,
      mapping,
      error:
        "Couldn't find a name and phone column. Rename your headers to include 'Name' and 'Phone' (or Mobile), then try again.",
    };
  }

  const get = (row: string[], field: string): string => {
    const idx = mapping[field];
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const today = todayInZone(gym.timezone);

  // Existing phone numbers, fetched once — a per-row query would be hundreds
  // of round trips on a real import.
  const existing = await db.member.findMany({
    where: { gymId: gym.id, status: { not: "CANCELLED" } },
    select: { phone: true },
  });
  const taken = new Set(existing.map((m) => m.phone));
  const seenInFile = new Set<string>();

  const rows: ImportRow[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const raw = parsed[i];
    const name = get(raw, "name");
    const phoneRaw = get(raw, "phone");
    const phone = normalizePhone(phoneRaw);

    const row: ImportRow = {
      line: i + 1,
      name,
      phone,
      planName: get(raw, "planName") || "Imported plan",
      joinDate: parseLooseDate(get(raw, "joinDate")),
      expiryDate: parseLooseDate(get(raw, "expiryDate")),
      amount: parseLooseMoney(get(raw, "amount")),
      balance: parseLooseMoney(get(raw, "balance")),
      email: get(raw, "email") || undefined,
      city: get(raw, "city") || undefined,
      notes: get(raw, "notes") || undefined,
    };

    if (!name) row.problem = "No name";
    else if (!phoneRaw) row.problem = "No phone number";
    else if (!isValidPhone(phoneRaw)) row.problem = `"${phoneRaw}" isn't a valid mobile number`;
    else if (taken.has(phone)) {
      row.problem = "Already a member with this number";
      row.duplicate = true;
    } else if (seenInFile.has(phone)) {
      row.problem = "Duplicate row in this file";
      row.duplicate = true;
    }

    if (!row.problem) seenInFile.add(phone);
    rows.push(row);
  }

  const valid = rows.filter((r) => !r.problem);
  const skipped = rows.length - valid.length;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      headers,
      mapping,
      rows,
      imported: 0,
      skipped,
    };
  }

  // Enforce the subscription's member cap before writing anything.
  if (gym.saasPlan && gym.saasPlan.memberLimit !== -1) {
    const current = await db.member.count({
      where: { gymId: gym.id, status: { not: "CANCELLED" } },
    });
    if (current + valid.length > gym.saasPlan.memberLimit) {
      return {
        ...empty,
        headers,
        mapping,
        rows,
        error: `This import would take you to ${current + valid.length} members, above your ${gym.saasPlan.name} plan's limit of ${gym.saasPlan.memberLimit}. Upgrade, or import fewer rows.`,
      };
    }
  }

  let imported = 0;

  for (const row of valid) {
    const joinDate = row.joinDate ?? today;

    const member = await db.member.create({
      data: {
        gymId: gym.id,
        code: await nextMemberCode(gym.id),
        name: row.name,
        phone: row.phone,
        email: row.email ?? null,
        city: row.city ?? null,
        notes: row.notes ?? null,
        joinDate,
        source: "OTHER",
        status: "ACTIVE",
      },
    });

    // Rebuild a membership window so the member is immediately part of
    // expiry tracking and reminders. Without this, an import is just a
    // contact list.
    if (row.expiryDate) {
      const endDate = utcDay(row.expiryDate);
      const startDate = joinDate <= endDate ? joinDate : addDays(endDate, -29);
      const durationDays = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
      );
      const payable = row.amount + row.balance;

      await db.membership.create({
        data: {
          gymId: gym.id,
          memberId: member.id,
          planName: row.planName,
          startDate,
          endDate,
          durationDays,
          price: payable,
          payable,
          status: endDate >= today ? "ACTIVE" : "EXPIRED",
          createdByStaffId: staff.id,
        },
      });

      if (row.amount > 0) {
        const { nextInvoiceNo } = await import("@/lib/members");
        await db.payment.create({
          data: {
            gymId: gym.id,
            memberId: member.id,
            amount: row.amount,
            mode: "OTHER",
            paidAt: joinDate,
            invoiceNo: await nextInvoiceNo(gym.id),
            notes: "Imported from spreadsheet",
            collectedByStaffId: staff.id,
          },
        });
      }

      await recomputeMember(member.id);
    }

    imported++;
  }

  await audit({
    gymId: gym.id,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "members.imported",
    meta: { imported, skipped, totalRows: rows.length },
  });

  revalidatePath("/app/members");
  revalidatePath("/app");

  return {
    ok: true,
    dryRun: false,
    headers,
    mapping,
    rows,
    imported,
    skipped,
  };
}
