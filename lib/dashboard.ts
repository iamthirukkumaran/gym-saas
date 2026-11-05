// Dashboard aggregates. Shared by the owner dashboard and the reports page so
// the two can never disagree about what "collected this month" means.

import { db } from "./db";
import { addDays, lastMonths, monthBounds, todayInZone } from "./dates";
import { EXPIRING_WINDOW_DAYS, INACTIVITY_RISK_DAYS } from "./constants";

export type GymMetrics = Awaited<ReturnType<typeof getGymMetrics>>;

export async function getGymMetrics(gymId: string, tz: string) {
  const today = todayInZone(tz);
  const horizon = addDays(today, EXPIRING_WINDOW_DAYS);
  const month = monthBounds(new Date(), tz);
  const prevMonth = {
    start: new Date(Date.UTC(month.start.getUTCFullYear(), month.start.getUTCMonth() - 1, 1)),
    end: month.start,
  };
  const riskCutoff = addDays(today, -INACTIVITY_RISK_DAYS);
  const tomorrow = addDays(today, 1);

  const [
    activeCount,
    expiringCount,
    expiredCount,
    frozenCount,
    totalMembers,
    newThisMonth,
    newPrevMonth,
    collectedThisMonth,
    collectedPrevMonth,
    duesAgg,
    duesCount,
    checkInsToday,
    atRiskCount,
    messagesThisMonth,
    failedMessages,
    expiredLast30,
  ] = await Promise.all([
    db.member.count({ where: { gymId, status: "ACTIVE", expiryDate: { gt: horizon } } }),
    db.member.count({
      where: { gymId, status: "ACTIVE", expiryDate: { gte: today, lte: horizon } },
    }),
    db.member.count({ where: { gymId, status: "EXPIRED" } }),
    db.member.count({ where: { gymId, status: "FROZEN" } }),
    db.member.count({ where: { gymId, status: { not: "CANCELLED" } } }),
    db.member.count({ where: { gymId, joinDate: { gte: month.start, lt: month.end } } }),
    db.member.count({ where: { gymId, joinDate: { gte: prevMonth.start, lt: prevMonth.end } } }),
    db.payment.aggregate({
      where: { gymId, paidAt: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { gymId, paidAt: { gte: prevMonth.start, lt: prevMonth.end } },
      _sum: { amount: true },
    }),
    db.member.aggregate({
      where: { gymId, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
      _sum: { balanceDue: true },
    }),
    db.member.count({ where: { gymId, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } } }),
    db.checkIn.count({ where: { gymId, checkInAt: { gte: today, lt: tomorrow } } }),
    db.member.count({
      where: {
        gymId,
        status: "ACTIVE",
        expiryDate: { gte: today },
        OR: [{ lastCheckInAt: { lt: riskCutoff } }, { lastCheckInAt: null }],
      },
    }),
    db.messageLog.count({
      where: {
        gymId,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.count({ where: { gymId, status: "FAILED", createdAt: { gte: addDays(today, -7) } } }),
    db.member.count({
      where: { gymId, status: "EXPIRED", expiryDate: { gte: addDays(today, -30), lt: today } },
    }),
  ]);

  // Renewal rate: of the memberships that ended in the last 30 days, how many
  // of those members have a window that runs past today? This is the single
  // number that tells an owner whether the automations are working.
  const endedLast30 = await db.membership.findMany({
    where: { gymId, endDate: { gte: addDays(today, -30), lt: today } },
    select: { memberId: true },
    distinct: ["memberId"],
  });
  const renewedCount = endedLast30.length
    ? await db.member.count({
        where: {
          id: { in: endedLast30.map((m) => m.memberId) },
          expiryDate: { gte: today },
        },
      })
    : 0;

  return {
    activeCount,
    expiringCount,
    expiredCount,
    frozenCount,
    totalMembers,
    newThisMonth,
    newPrevMonth,
    collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
    collectedPrevMonth: collectedPrevMonth._sum.amount ?? 0,
    duesTotal: duesAgg._sum.balanceDue ?? 0,
    duesCount,
    checkInsToday,
    atRiskCount,
    messagesThisMonth,
    failedMessages,
    expiredLast30,
    renewalBase: endedLast30.length,
    renewedCount,
    renewalRate: endedLast30.length === 0 ? null : (renewedCount / endedLast30.length) * 100,
  };
}

/** Collections per month for the revenue chart. */
export async function getRevenueSeries(gymId: string, months: number, tz: string) {
  const buckets = lastMonths(months, tz);
  const rows = await Promise.all(
    buckets.map((b) =>
      db.payment.aggregate({
        where: { gymId, paidAt: { gte: b.start, lt: b.end } },
        _sum: { amount: true },
      }),
    ),
  );
  return buckets.map((b, i) => ({ label: b.label, value: rows[i]._sum.amount ?? 0 }));
}

/** Joins vs expiries per month — growth versus leakage, side by side. */
export async function getGrowthSeries(gymId: string, months: number, tz: string) {
  const buckets = lastMonths(months, tz);
  const joins = await Promise.all(
    buckets.map((b) =>
      db.member.count({ where: { gymId, joinDate: { gte: b.start, lt: b.end } } }),
    ),
  );
  const expiries = await Promise.all(
    buckets.map((b) =>
      db.membership.count({ where: { gymId, endDate: { gte: b.start, lt: b.end } } }),
    ),
  );
  return buckets.map((b, i) => ({
    label: b.label,
    joins: joins[i],
    expiries: expiries[i],
  }));
}

/** Which plans members are actually on — tells an owner what to promote. */
export async function getPlanMix(gymId: string) {
  const rows = await db.member.groupBy({
    by: ["activePlanName"],
    where: { gymId, status: { in: ["ACTIVE", "FROZEN"] }, activePlanName: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { activePlanName: "desc" } },
    take: 6,
  });
  return rows.map((r) => ({ label: r.activePlanName ?? "—", value: r._count._all }));
}

/** Check-ins per day for the last two weeks — the attendance pulse. */
export async function getCheckInSeries(gymId: string, days: number, tz: string) {
  const today = todayInZone(tz);
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = addDays(today, -i);
    const end = addDays(today, -i + 1);
    const value = await db.checkIn.count({
      where: { gymId, checkInAt: { gte: start, lt: end } },
    });
    out.push({ label: String(start.getUTCDate()), value });
  }
  return out;
}
