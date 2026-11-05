import Link from "next/link";
import type { Metadata } from "next";

import { AreaChart, BarChart, Donut, Meter } from "@/components/charts";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconDownload, IconTrendDown, IconTrendUp } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { SOURCE_LABELS } from "@/lib/constants";
import { addDays, lastMonths, todayInZone } from "@/lib/dates";
import { money, moneyCompact, num, pct, plural } from "@/lib/format";
import {
  getGrowthSeries,
  getGymMetrics,
  getPlanMix,
  getRevenueSeries,
} from "@/lib/dashboard";

export const metadata: Metadata = { title: "Reports" };

/**
 * Reports.
 *
 * Four questions, answered plainly: am I collecting more than last month, am I
 * keeping the members I win, where do new members come from, and which plans
 * actually sell. Everything else is noise at this size of business.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const sp = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const months = [3, 6, 12].includes(Number(sp.months)) ? Number(sp.months) : 6;

  const [metrics, revenue, growth, planMix, sourceMix, buckets] = await Promise.all([
    getGymMetrics(gym.id, tz),
    getRevenueSeries(gym.id, months, tz),
    getGrowthSeries(gym.id, months, tz),
    getPlanMix(gym.id),
    db.member.groupBy({
      by: ["source"],
      where: { gymId: gym.id, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
    Promise.resolve(lastMonths(months, tz)),
  ]);

  // Month-by-month table: collections, joins, expiries and net movement.
  const monthRows = await Promise.all(
    buckets.map(async (b) => {
      const [collected, joins, expiries, newMembers] = await Promise.all([
        db.payment.aggregate({
          where: { gymId: gym.id, paidAt: { gte: b.start, lt: b.end } },
          _sum: { amount: true },
          _count: true,
        }),
        db.member.count({ where: { gymId: gym.id, joinDate: { gte: b.start, lt: b.end } } }),
        db.membership.count({
          where: { gymId: gym.id, endDate: { gte: b.start, lt: b.end } },
        }),
        db.membership.count({
          where: { gymId: gym.id, isRenewal: true, createdAt: { gte: b.start, lt: b.end } },
        }),
      ]);
      return {
        label: b.label,
        collected: collected._sum.amount ?? 0,
        payments: collected._count,
        joins,
        expiries,
        renewals: newMembers,
      };
    }),
  );

  const [topSpenders, trainerLoad, longestStanding] = await Promise.all([
    db.member.findMany({
      where: { gymId: gym.id, totalPaid: { gt: 0 } },
      orderBy: { totalPaid: "desc" },
      take: 8,
      select: { id: true, name: true, code: true, totalPaid: true, activePlanName: true },
    }),
    db.trainer.findMany({
      where: { gymId: gym.id, active: true },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.member.findMany({
      where: { gymId: gym.id, status: "ACTIVE" },
      orderBy: { joinDate: "asc" },
      take: 6,
      select: { id: true, name: true, joinDate: true, totalPaid: true },
    }),
  ]);

  const totalCollected = revenue.reduce((s, r) => s + r.value, 0);
  const avgMonthly = months > 0 ? Math.round(totalCollected / months) : 0;
  const lastTwo = revenue.slice(-2);
  const momDelta =
    lastTwo.length === 2 && lastTwo[0].value > 0
      ? ((lastTwo[1].value - lastTwo[0].value) / lastTwo[0].value) * 100
      : null;

  // Revenue per active member — the number that tells you whether to raise
  // prices or sell longer plans.
  const arpu = metrics.activeCount > 0 ? Math.round(avgMonthly / metrics.activeCount) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        subtitle="The four numbers that tell you whether the gym is actually growing."
        action={
          <>
            <div className="flex overflow-hidden rounded-lg border border-ink-200 bg-white">
              {[3, 6, 12].map((m) => (
                <Link
                  key={m}
                  href={`/app/reports?months=${m}`}
                  className={
                    months === m
                      ? "bg-ink-900 px-3 py-2 text-[13px] font-medium text-white"
                      : "px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50"
                  }
                >
                  {m}m
                </Link>
              ))}
            </div>
            <a
              href="/api/export/members"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
              <IconDownload className="size-4" />
              Export data
            </a>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Collected (${months} months)`}
          value={moneyCompact(totalCollected)}
          sub={`${money(avgMonthly)} monthly average`}
          tone="brand"
        />
        <Stat
          label="Month on month"
          value={momDelta === null ? "—" : `${momDelta >= 0 ? "+" : ""}${momDelta.toFixed(0)}%`}
          sub="vs the previous month"
          tone={momDelta === null ? "neutral" : momDelta >= 0 ? "good" : "bad"}
          icon={momDelta !== null && momDelta < 0 ? <IconTrendDown className="size-4" /> : <IconTrendUp className="size-4" />}
        />
        <Stat
          label="Renewal rate"
          value={metrics.renewalRate === null ? "—" : `${metrics.renewalRate.toFixed(0)}%`}
          sub={`${metrics.renewedCount}/${metrics.renewalBase} in the last 30 days`}
          tone={
            metrics.renewalRate === null
              ? "neutral"
              : metrics.renewalRate >= 70
                ? "good"
                : metrics.renewalRate >= 50
                  ? "warn"
                  : "bad"
          }
        />
        <Stat
          label="Revenue per member"
          value={money(arpu)}
          sub="per active member, per month"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Collections"
            subtitle={`Last ${months} months`}
            action={
              <Badge className="bg-brand-50 text-brand-700 ring-brand-500/20">
                {moneyCompact(totalCollected)}
              </Badge>
            }
          />
          <div className="mt-4">
            <BarChart data={revenue} format={moneyCompact} height={200} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Member movement" subtitle="New joins each month" />
          <div className="mt-4">
            <AreaChart
              data={growth.map((g) => ({ label: g.label, value: g.joins }))}
              height={200}
              tone={1}
            />
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Plan mix" subtitle="What active members are on" />
          <div className="mt-5">
            {planMix.length === 0 ? (
              <EmptyState title="No active plans" />
            ) : (
              <Donut
                data={planMix}
                size={128}
                centreValue={num(planMix.reduce((s, p) => s + p.value, 0))}
                centreLabel="members"
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Where members come from" subtitle="All time" />
          <div className="mt-5">
            {sourceMix.length === 0 ? (
              <EmptyState title="No source data" />
            ) : (
              <Donut
                data={sourceMix
                  .filter((s) => s._count._all > 0)
                  .map((s) => ({
                    label: s.source ? (SOURCE_LABELS[s.source] ?? s.source) : "Not recorded",
                    value: s._count._all,
                  }))}
                size={128}
                centreValue={num(sourceMix.reduce((a, s) => a + s._count._all, 0))}
                centreLabel="members"
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Member health" subtitle="Right now" />
          <div className="mt-4 space-y-3.5">
            {[
              { label: "Active", value: metrics.activeCount, tone: "good" as const },
              { label: "Expiring in 7 days", value: metrics.expiringCount, tone: "warn" as const },
              { label: "Expired", value: metrics.expiredCount, tone: "bad" as const },
              { label: "Frozen", value: metrics.frozenCount, tone: "brand" as const },
              { label: "At risk (no visits)", value: metrics.atRiskCount, tone: "warn" as const },
            ].map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-ink-600">{r.label}</span>
                  <span className="nums text-[13px] font-semibold text-ink-900">
                    {num(r.value)}
                    <span className="ml-1 text-[11px] font-normal text-ink-400">
                      {pct(r.value, metrics.totalMembers)}
                    </span>
                  </span>
                </div>
                <Meter value={r.value} max={Math.max(metrics.totalMembers, 1)} tone={r.tone} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card pad={false} className="mb-5">
        <div className="p-5 pb-2">
          <CardHeader
            title="Month by month"
            subtitle="Collections against member movement — the clearest view of whether you're growing."
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th align="right">Collected</Th>
              <Th align="right">Payments</Th>
              <Th align="right">New joins</Th>
              <Th align="right">Renewals</Th>
              <Th align="right">Expiries</Th>
              <Th align="right">Net</Th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map((r) => {
              const net = r.joins + r.renewals - r.expiries;
              return (
                <Tr key={r.label}>
                  <Td className="text-[13px] font-medium text-ink-900">{r.label}</Td>
                  <Td align="right" className="nums text-[13px] font-semibold text-good-700">
                    {money(r.collected)}
                  </Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">{num(r.payments)}</Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">{num(r.joins)}</Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">{num(r.renewals)}</Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">{num(r.expiries)}</Td>
                  <Td align="right" className="nums text-[13px]">
                    <span
                      className={
                        net > 0
                          ? "font-semibold text-good-700"
                          : net < 0
                            ? "font-semibold text-bad-600"
                            : "text-ink-500"
                      }
                    >
                      {net > 0 ? "+" : ""}
                      {num(net)}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader title="Highest lifetime value" subtitle="Total paid, all time" />
          </div>
          {topSpenders.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No payments yet" />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {topSpenders.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="nums grid size-6 shrink-0 place-items-center rounded-md bg-ink-100 text-[11px] font-semibold text-ink-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/members/${m.id}`}
                      className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                    >
                      {m.name}
                    </Link>
                    <p className="truncate text-[11px] text-ink-500">{m.activePlanName ?? "—"}</p>
                  </div>
                  <span className="nums shrink-0 text-[13px] font-semibold text-good-700">
                    {money(m.totalPaid)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader title="Trainer load" subtitle="Members assigned per trainer" />
          </div>
          {trainerLoad.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No trainers added" />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {trainerLoad.map((t) => (
                <li key={t.id} className="px-5 py-2.5">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-ink-900">{t.name}</span>
                    <span className="nums text-[13px] text-ink-600">
                      {num(t._count.members)} {plural(t._count.members, "member")}
                    </span>
                  </div>
                  <Meter
                    value={t._count.members}
                    max={Math.max(...trainerLoad.map((x) => x._count.members), 1)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader title="Most loyal" subtitle="Longest continuously active" />
          </div>
          {longestStanding.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No active members" />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {longestStanding.map((m) => {
                const years = (today.getTime() - m.joinDate.getTime()) / (365 * 86_400_000);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/members/${m.id}`}
                        className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                      >
                        {m.name}
                      </Link>
                      <p className="text-[11px] text-ink-500">
                        {years >= 1 ? `${years.toFixed(1)} years` : `${Math.round(years * 12)} months`}
                      </p>
                    </div>
                    <span className="nums shrink-0 text-[12.5px] text-ink-600">
                      {money(m.totalPaid)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
