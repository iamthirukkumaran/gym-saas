import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { toRupees } from "@/lib/format";
import { deriveStatus } from "@/lib/status";
import { STATUS_LABELS } from "@/lib/constants";
import { statusWhere } from "@/lib/status";
import type { DerivedStatus } from "@/lib/constants";

/**
 * Member export.
 *
 * "Your data is yours" is a real objection-handler when selling to someone
 * who has been burned by software before — so export honours the same filters
 * as the list view and includes everything, not a token subset.
 */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const gym = await db.gym.findUnique({
    where: { id: session.gymId },
    select: { id: true, slug: true, timezone: true },
  });
  if (!gym) return NextResponse.json({ error: "Gym not found" }, { status: 404 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = (url.searchParams.get("status") ?? "") as DerivedStatus | "";
  const plan = url.searchParams.get("plan") ?? "";
  const trainer = url.searchParams.get("trainer") ?? "";

  const where: Prisma.MemberWhereInput = {
    gymId: gym.id,
    ...(status ? statusWhere(status, gym.timezone) : {}),
    ...(plan ? { activePlanName: plan } : {}),
    ...(trainer ? { trainerId: trainer } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { code: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const members = await db.member.findMany({
    where,
    orderBy: { code: "asc" },
    include: { trainer: { select: { name: true } } },
  });

  const headers = [
    "Member ID", "Name", "Phone", "Alt phone", "Email", "Gender", "Date of birth",
    "Join date", "Status", "Plan", "Expiry date", "Total paid (INR)", "Balance due (INR)",
    "Last check-in", "Trainer", "Source", "City", "Address", "Emergency contact",
    "Emergency phone", "Height (cm)", "Weight (kg)", "Goal", "WhatsApp opted out", "Notes",
  ];

  const rows = members.map((m) => [
    m.code,
    m.name,
    m.phone,
    m.altPhone ?? "",
    m.email ?? "",
    m.gender ?? "",
    toDateInput(m.dob),
    toDateInput(m.joinDate),
    STATUS_LABELS[deriveStatus(m, gym.timezone)],
    m.activePlanName ?? "",
    toDateInput(m.expiryDate),
    toRupees(m.totalPaid),
    toRupees(m.balanceDue),
    m.lastCheckInAt ? toDateInput(m.lastCheckInAt) : "",
    m.trainer?.name ?? "",
    m.source ?? "",
    m.city ?? "",
    m.addressLine ?? "",
    m.emergencyName ?? "",
    m.emergencyPhone ?? "",
    m.heightCm ?? "",
    m.weightKg ?? "",
    m.goal ?? "",
    m.waOptOut ? "yes" : "no",
    m.notes ?? "",
  ]);

  const csv = toCsv(headers, rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="astryx-${gym.slug}-members-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
