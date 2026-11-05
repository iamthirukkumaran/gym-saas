// Platform-wide aggregates for the Astryx admin console.
// Everything here spans tenants, so none of it is gym-scoped.

import { db } from "./db";
import { addDays, lastMonths, monthBounds, todayInZone } from "./dates";

/**
 * Monthly recurring revenue.
 *
 * Yearly subscriptions are normalised to a monthly figure (÷12) so MRR stays
 * comparable; trialing and cancelled tenants are excluded because they aren't
 * paying yet.
 */
export async function getMrr() {
  const subs = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
    select: { amount: true, billingCycle: true, status: true },
  });

  let mrr = 0;
  let atRisk = 0;
  for (const s of subs) {
    const monthly = s.billingCycle === "YEARLY" ? Math.round(s.amount / 12) : s.amount;
    mrr += monthly;
    if (s.status === "PAST_DUE") atRisk += monthly;
  }
  return { mrr, arr: mrr * 12, atRisk, payingCount: subs.length };
}

export async function getPlatformMetrics() {
  const today = todayInZone();
  const month = monthBounds();

  const [
    totalGyms,
    activeGyms,
    trialGyms,
    pastDueGyms,
    suspendedGyms,
    totalMembers,
    activeMembers,
    newGymsThisMonth,
    messagesThisMonth,
    failedThisMonth,
    gmv,
    mrr,
    trialsEndingSoon,
    unpaidInvoices,
  ] = await Promise.all([
    db.gym.count(),
    db.gym.count({ where: { status: "ACTIVE" } }),
    db.gym.count({ where: { status: "TRIAL" } }),
    db.gym.count({ where: { status: "PAST_DUE" } }),
    db.gym.count({ where: { status: { in: ["SUSPENDED", "CANCELLED"] } } }),
    db.member.count({ where: { status: { not: "CANCELLED" } } }),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.gym.count({ where: { createdAt: { gte: month.start, lt: month.end } } }),
    db.messageLog.count({
      where: {
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.count({
      where: { status: "FAILED", createdAt: { gte: month.start, lt: month.end } },
    }),
    // Gross payment volume our tenants collected — the value we're creating.
    db.payment.aggregate({
      where: { paidAt: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    getMrr(),
    db.gym.count({
      where: { status: "TRIAL", trialEndsAt: { gte: today, lte: addDays(today, 7) } },
    }),
    db.saasInvoice.aggregate({
      where: { status: { in: ["DUE", "OVERDUE"] } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return {
    totalGyms,
    activeGyms,
    trialGyms,
    pastDueGyms,
    suspendedGyms,
    totalMembers,
    activeMembers,
    newGymsThisMonth,
    messagesThisMonth,
    failedThisMonth,
    gmvThisMonth: gmv._sum.amount ?? 0,
    ...mrr,
    trialsEndingSoon,
    unpaidTotal: unpaidInvoices._sum.total ?? 0,
    unpaidCount: unpaidInvoices._count,
  };
}

/** Tenant signups per month, for the growth chart. */
export async function getSignupSeries(months: number) {
  const buckets = lastMonths(months);
  const counts = await Promise.all(
    buckets.map((b) => db.gym.count({ where: { createdAt: { gte: b.start, lt: b.end } } })),
  );
  return buckets.map((b, i) => ({ label: b.label, value: counts[i] }));
}

/** Platform revenue recognised per month, from paid invoices. */
export async function getPlatformRevenueSeries(months: number) {
  const buckets = lastMonths(months);
  const rows = await Promise.all(
    buckets.map((b) =>
      db.saasInvoice.aggregate({
        where: { status: "PAID", paidAt: { gte: b.start, lt: b.end } },
        _sum: { total: true },
      }),
    ),
  );
  return buckets.map((b, i) => ({ label: b.label, value: rows[i]._sum.total ?? 0 }));
}

/** Messages sent platform-wide per day, for capacity monitoring. */
export async function getMessageSeries(days: number) {
  const today = todayInZone();
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = addDays(today, -i);
    const end = addDays(today, -i + 1);
    const value = await db.messageLog.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    out.push({ label: String(start.getUTCDate()), value });
  }
  return out;
}

/**
 * Tenants worth a phone call: trials about to lapse, overdue accounts, and
 * gyms whose automations are off (they're getting no value and will churn).
 */
export async function getAttentionList() {
  const today = todayInZone();

  const [endingTrials, overdue, automationsOff, noMembers] = await Promise.all([
    db.gym.findMany({
      where: { status: "TRIAL", trialEndsAt: { gte: today, lte: addDays(today, 7) } },
      orderBy: { trialEndsAt: "asc" },
      select: { id: true, name: true, trialEndsAt: true, _count: { select: { members: true } } },
      take: 8,
    }),
    db.gym.findMany({
      where: { status: { in: ["PAST_DUE", "SUSPENDED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, _count: { select: { members: true } } },
      take: 8,
    }),
    db.gym.findMany({
      where: { autoRemindersEnabled: false, status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, name: true, _count: { select: { members: true } } },
      take: 8,
    }),
    db.gym.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] }, members: { none: {} } },
      select: { id: true, name: true, createdAt: true },
      take: 8,
    }),
  ]);

  return { endingTrials, overdue, automationsOff, noMembers };
}
