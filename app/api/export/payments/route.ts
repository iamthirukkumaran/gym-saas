import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { toRupees } from "@/lib/format";
import { MODE_LABELS } from "@/lib/constants";

/** Payment export — the file an owner hands to their accountant. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const gym = await db.gym.findUnique({
    where: { id: session.gymId },
    select: { id: true, slug: true, gstin: true },
  });
  if (!gym) return NextResponse.json({ error: "Gym not found" }, { status: 404 });

  const payments = await db.payment.findMany({
    where: { gymId: gym.id },
    orderBy: { paidAt: "desc" },
    include: {
      member: { select: { code: true, name: true, phone: true } },
      membership: { select: { planName: true, startDate: true, endDate: true } },
    },
  });

  const headers = [
    "Invoice no", "Date", "Member ID", "Member name", "Phone", "Plan",
    "Plan start", "Plan end", "Amount (INR)", "Mode", "Reference", "Notes",
  ];

  const rows = payments.map((p) => [
    p.invoiceNo,
    toDateInput(p.paidAt),
    p.member.code,
    p.member.name,
    p.member.phone,
    p.membership?.planName ?? "",
    p.membership ? toDateInput(p.membership.startDate) : "",
    p.membership ? toDateInput(p.membership.endDate) : "",
    toRupees(p.amount),
    MODE_LABELS[p.mode] ?? p.mode,
    p.reference ?? "",
    p.notes ?? "",
  ]);

  const csv = toCsv(headers, rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="astryx-${gym.slug}-payments-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
