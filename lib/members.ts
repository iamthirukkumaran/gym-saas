// Server-side only: imports the Prisma client and is also invoked from the
// CLI (scripts/run-engine.ts, prisma/seed.ts), so it deliberately does not
// use the `server-only` marker — that package throws outside React's server
// condition. Importing this from a Client Component fails at build time
// anyway, because Prisma cannot be bundled for the browser.
import { db } from "./db";
import { addDays, todayInZone, utcDay } from "./dates";

/**
 * Member write-path. Every mutation that can affect a member's money or
 * expiry funnels through here so the denormalised read-model columns on
 * `Member` can never disagree with the underlying rows.
 */

// ── Sequence allocation ─────────────────────────────────────────────────────

/**
 * MBR-0001, per gym. Uses an atomic counter column rather than COUNT(*) + 1,
 * which would hand two members the same code if the front desk and the
 * owner saved at the same moment.
 */
export async function nextMemberCode(gymId: string): Promise<string> {
  const gym = await db.gym.update({
    where: { id: gymId },
    data: { memberSeq: { increment: 1 } },
    select: { memberSeq: true },
  });
  return `MBR-${String(gym.memberSeq).padStart(4, "0")}`;
}

export async function nextInvoiceNo(gymId: string): Promise<string> {
  const gym = await db.gym.update({
    where: { id: gymId },
    data: { invoiceSeq: { increment: 1 } },
    select: { invoiceSeq: true, slug: true },
  });
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${String(gym.invoiceSeq).padStart(5, "0")}`;
}

// ── Read-model recompute ────────────────────────────────────────────────────

/**
 * Recalculates `expiryDate`, `activePlanName`, `totalPaid`, `balanceDue` and
 * `status` from the member's memberships and payments.
 *
 * Dashboards read these columns directly instead of aggregating per member,
 * which is the difference between a dashboard that loads instantly at 2,000
 * members and one that times out.
 */
export async function recomputeMember(memberId: string): Promise<void> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: {
      gym: { select: { timezone: true } },
      memberships: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { endDate: "desc" },
      },
      payments: { select: { amount: true } },
    },
  });
  if (!member) return;

  const today = todayInZone(member.gym.timezone);

  const latest = member.memberships[0] ?? null;
  const covering =
    member.memberships.find((m) => m.startDate <= today && m.endDate >= today) ?? latest;

  const totalPaid = member.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalBilled = member.memberships.reduce((sum, m) => sum + m.payable, 0);

  // A credit balance (prepayment) shows as zero due, not negative.
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  // FROZEN and CANCELLED are deliberate human decisions; the recompute must
  // not quietly undo them.
  const manualState = member.status === "FROZEN" || member.status === "CANCELLED";
  const expiryDate = latest?.endDate ?? null;
  const status = manualState
    ? member.status
    : expiryDate && expiryDate >= today
      ? "ACTIVE"
      : expiryDate
        ? "EXPIRED"
        : member.status;

  await db.member.update({
    where: { id: memberId },
    data: {
      expiryDate,
      activePlanName: covering?.planName ?? null,
      totalPaid,
      balanceDue,
      status,
    },
  });
}

// ── Membership lifecycle ────────────────────────────────────────────────────

type AssignPlanInput = {
  gymId: string;
  memberId: string;
  planId?: string | null;
  /** Snapshot values; required when `planId` is absent (custom plan). */
  planName: string;
  durationDays: number;
  price: number;
  discount?: number;
  joiningFee?: number;
  startDate: Date;
  autoRenew?: boolean;
  isRenewal?: boolean;
  createdByStaffId?: string | null;
};

/**
 * Creates a membership window.
 *
 * Renewals stack: if the member's current plan still has days left, the new
 * window starts the day *after* it ends rather than today. Losing paid-for
 * days on renewal is the fastest way to make an owner distrust the software.
 */
export async function assignMembership(input: AssignPlanInput) {
  const { gymId, memberId } = input;

  const existing = await db.membership.findFirst({
    where: { gymId, memberId, status: { in: ["ACTIVE", "UPCOMING"] } },
    orderBy: { endDate: "desc" },
  });

  const gym = await db.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { timezone: true },
  });
  const today = todayInZone(gym.timezone);

  let startDate = utcDay(input.startDate);
  if (input.isRenewal && existing && existing.endDate >= today) {
    startDate = addDays(existing.endDate, 1);
  }

  const endDate = addDays(startDate, input.durationDays - 1);
  const discount = input.discount ?? 0;
  const joiningFee = input.joiningFee ?? 0;
  const payable = Math.max(0, input.price - discount + joiningFee);

  const membership = await db.membership.create({
    data: {
      gymId,
      memberId,
      planId: input.planId ?? null,
      planName: input.planName,
      startDate,
      endDate,
      durationDays: input.durationDays,
      price: input.price,
      discount,
      payable,
      status: startDate > today ? "UPCOMING" : "ACTIVE",
      autoRenew: input.autoRenew ?? false,
      isRenewal: input.isRenewal ?? false,
      createdByStaffId: input.createdByStaffId ?? null,
    },
  });

  await recomputeMember(memberId);
  return membership;
}

type PaymentInput = {
  gymId: string;
  memberId: string;
  membershipId?: string | null;
  amount: number;
  mode: string;
  paidAt?: Date;
  reference?: string | null;
  notes?: string | null;
  collectedByStaffId?: string | null;
};

export async function recordPayment(input: PaymentInput) {
  const invoiceNo = await nextInvoiceNo(input.gymId);

  const payment = await db.payment.create({
    data: {
      gymId: input.gymId,
      memberId: input.memberId,
      membershipId: input.membershipId ?? null,
      amount: input.amount,
      mode: input.mode,
      paidAt: input.paidAt ?? new Date(),
      invoiceNo,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      collectedByStaffId: input.collectedByStaffId ?? null,
    },
  });

  await recomputeMember(input.memberId);
  return payment;
}

/**
 * Pauses a membership. The remaining days are preserved by pushing `endDate`
 * out when the member unfreezes, so a holiday doesn't cost them a month.
 */
export async function freezeMember(gymId: string, memberId: string) {
  const active = await db.membership.findFirst({
    where: { gymId, memberId, status: "ACTIVE" },
    orderBy: { endDate: "desc" },
  });

  if (active) {
    await db.membership.update({
      where: { id: active.id },
      data: { status: "FROZEN", frozenAt: new Date() },
    });
  }
  await db.member.update({ where: { id: memberId }, data: { status: "FROZEN" } });
}

export async function unfreezeMember(gymId: string, memberId: string) {
  const frozen = await db.membership.findFirst({
    where: { gymId, memberId, status: "FROZEN" },
    orderBy: { endDate: "desc" },
  });

  if (frozen) {
    const pausedDays = frozen.frozenAt
      ? Math.max(
          0,
          Math.floor((Date.now() - frozen.frozenAt.getTime()) / (24 * 60 * 60 * 1000)),
        )
      : 0;

    await db.membership.update({
      where: { id: frozen.id },
      data: {
        status: "ACTIVE",
        endDate: addDays(frozen.endDate, pausedDays),
        freezeDays: frozen.freezeDays + pausedDays,
        frozenAt: null,
      },
    });
  }

  await db.member.update({ where: { id: memberId }, data: { status: "ACTIVE" } });
  await recomputeMember(memberId);
}

export async function checkInMember(gymId: string, memberId: string, method = "MANUAL", staffId?: string) {
  const checkIn = await db.checkIn.create({
    data: { gymId, memberId, method, staffId: staffId ?? null },
  });
  await db.member.update({
    where: { id: memberId },
    data: { lastCheckInAt: checkIn.checkInAt },
  });
  return checkIn;
}
