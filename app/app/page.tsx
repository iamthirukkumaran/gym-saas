import Link from "next/link";
import type { Metadata } from "next";

import { AreaChart, BarChart, Donut, Meter } from "@/components/charts";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  Stat,
} from "@/components/ui";
import {
  IconAlert,
  IconCalendarCheck,
  IconChevronRight,
  IconRenew,
  IconRupee,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
  IconWallet,
  IconWhatsApp,
  IconZap,
} from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRING_WINDOW_DAYS, INACTIVITY_RISK_DAYS } from "@/lib/constants";
import { addDays, fmtDate, hourLabel, relativeDayLabel, todayInZone } from "@/lib/dates";
import { money, moneyCompact, num, plural } from "@/lib/format";
import { daysRemaining, deriveStatus, STATUS_STYLES } from "@/lib/status";
import {
  getCheckInSeries,
  getGrowthSeries,
  getGymMetrics,
  getPlanMix,
  getRevenueSeries,
} from "@/lib/dashboard";
import { previewUpcoming } from "@/lib/engine";
import { describeRule } from "@/lib/provisioning";
import { displayPhone, waDeepLink } from "@/lib/phone";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const horizon = addDays(today, EXPIRING_WINDOW_DAYS);

  const [metrics, revenue, growth, planMix, checkIns, upcoming] = await Promise.all([
    getGymMetrics(gym.id, tz),
    getRevenueSeries(gym.id, 6, tz),
    getGrowthSeries(gym.id, 6, tz),
    getPlanMix(gym.id),
    getCheckInSeries(gym.id, 14, tz),
    previewUpcoming(gym.id, 7),
  ]);

  const [expiringList, duesList, atRiskList, recentMessages] = await Promise.all([
    db.member.findMany({
      where: { gymId: gym.id, status: "ACTIVE", expiryDate: { gte: today, lte: horizon } },
      orderBy: { expiryDate: "asc" },
      take: 8,
      select: {
        id: true, code: true, name: true, phone: true, expiryDate: true,
        activePlanName: true, balanceDue: true, status: true,
      },
    }),
    db.member.findMany({
      where: { gymId: gym.id, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
      orderBy: { balanceDue: "desc" },
      take: 6,
      select: { id: true, code: true, name: true, balanceDue: true, activePlanName: true },
    }),
    db.member.findMany({
      where: {
        gymId: gym.id,
        status: "ACTIVE",
        expiryDate: { gte: today },
        OR: [{ lastCheckInAt: { lt: addDays(today, -INACTIVITY_RISK_DAYS) } }, { lastCheckInAt: null }],
      },
      orderBy: { lastCheckInAt: "asc" },
      take: 6,
      select: { id: true, code: true, name: true, lastCheckInAt: true, expiryDate: true },
    }),
    db.messageLog.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, status: true, templateKey: true, createdAt: true,
        toPhone: true, member: { select: { name: true } },
      },
    }),
  ]);

  const collectedDelta =
    metrics.collectedPrevMonth === 0
      ? null
      : ((metrics.collectedThisMonth - metrics.collectedPrevMonth) / metrics.collectedPrevMonth) * 100;
  const joinsDelta = metrics.newThisMonth - metrics.newPrevMonth;
  const totalUpcoming = upcoming.reduce((s, u) => s + u.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Headline metrics ──────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">
              Today at {gym.name}
            </h2>
            <p className="text-[13px] text-ink-500">
              {fmtDate(today)} · reminders go out at {hourLabel(gym.reminderSendHour)}
            </p>
          </div>
          <LinkButton href="/app/members/new" size="sm">
            Add member
          </LinkButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="Active members"
            value={num(metrics.activeCount)}
            sub={`${num(metrics.totalMembers)} on the books`}
            tone="good"
            icon={<IconUsers className="size-4" />}
            href="/app/members?status=ACTIVE"
          />
          <Stat
            label={`Expiring in ${EXPIRING_WINDOW_DAYS} days`}
            value={num(metrics.expiringCount)}
            sub="needs a renewal nudge"
            tone={metrics.expiringCount > 0 ? "warn" : "neutral"}
            icon={<IconRenew className="size-4" />}
            href="/app/renewals"
          />
          <Stat
            label="Expired"
            value={num(metrics.expiredCount)}
            sub={`${num(metrics.expiredLast30)} in the last 30 days`}
            tone={metrics.expiredCount > 0 ? "bad" : "neutral"}
            icon={<IconTrendDown className="size-4" />}
            href="/app/renewals?tab=expired"
          />
          <Stat
            label="Collected this month"
            value={moneyCompact(metrics.collectedThisMonth)}
            sub={
              collectedDelta === null ? (
                "no prior month to compare"
              ) : (
                <span className={collectedDelta >= 0 ? "text-good-600" : "text-bad-600"}>
                  {collectedDelta >= 0 ? "▲" : "▼"} {Math.abs(collectedDelta).toFixed(0)}% vs last month
                </span>
              )
            }
            tone="brand"
            icon={<IconRupee className="size-4" />}
            href="/app/payments"
          />
          <Stat
            label="Pending dues"
            value={moneyCompact(metrics.duesTotal)}
            sub={`${num(metrics.duesCount)} ${plural(metrics.duesCount, "member")}`}
            tone={metrics.duesTotal > 0 ? "warn" : "neutral"}
            icon={<IconWallet className="size-4" />}
            href="/app/payments?tab=dues"
          />
          <Stat
            label="Check-ins today"
            value={num(metrics.checkInsToday)}
            sub={`${num(metrics.atRiskCount)} not seen in ${INACTIVITY_RISK_DAYS}d`}
            icon={<IconCalendarCheck className="size-4" />}
            href="/app/attendance"
          />
        </div>
      </section>

      {/* ── Action list + automation preview ──────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card pad={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Renewals due this week"
              subtitle={
                expiringList.length === 0
                  ? "Nothing expiring in the next 7 days."
                  : `${metrics.expiringCount} ${plural(metrics.expiringCount, "member")} to secure. Astryx is already messaging them.`
              }
              action={
                <Link
                  href="/app/renewals"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  All renewals
                  <IconChevronRight className="size-3.5" />
                </Link>
              }
            />
          </div>

          {expiringList.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="No renewals pending"
                body="Every active member has more than a week left. Automations will flag the next batch automatically."
                icon={<IconZap className="size-7" />}
              />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Expires</Th>
                  <Th align="right">Dues</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {expiringList.map((m) => {
                  const left = daysRemaining(m.expiryDate, tz) ?? 0;
                  return (
                    <Tr key={m.id}>
                      <Td>
                        <Link href={`/app/members/${m.id}`} className="flex items-center gap-2.5 group">
                          <Avatar name={m.name} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-ink-900 group-hover:text-brand-700">
                              {m.name}
                            </span>
                            <span className="block font-mono text-[11px] text-ink-400">{m.code}</span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="text-[13px]">{m.activePlanName ?? "—"}</Td>
                      <Td>
                        <span className="block text-[13px] text-ink-800">{fmtDate(m.expiryDate)}</span>
                        <span
                          className={
                            left <= 1
                              ? "text-[11px] font-semibold text-bad-600"
                              : left <= 3
                                ? "text-[11px] font-semibold text-warn-600"
                                : "text-[11px] text-ink-500"
                          }
                        >
                          {left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`}
                        </span>
                      </Td>
                      <Td align="right" className="nums text-[13px]">
                        {m.balanceDue > 0 ? (
                          <span className="font-medium text-warn-700">{money(m.balanceDue)}</span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          <a
                            href={waDeepLink(m.phone, `Hi ${m.name.split(" ")[0]}, your ${gym.name} membership expires on ${fmtDate(m.expiryDate)}. Shall I renew it for you?`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${displayPhone(m.phone)}`}
                            className="grid size-7 place-items-center rounded-md text-good-600 transition-colors hover:bg-good-50"
                          >
                            <IconWhatsApp className="size-4" />
                          </a>
                          <Link
                            href={`/app/members/${m.id}/renew`}
                            className="rounded-md bg-brand-50 px-2 py-1 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                          >
                            Renew
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Automation preview — proof the system is working, before it speaks */}
        <Card>
          <CardHeader
            title="WhatsApp queue — next 7 days"
            subtitle={
              totalUpcoming === 0
                ? "No reminders scheduled."
                : `${totalUpcoming} ${plural(totalUpcoming, "message")} will go out automatically.`
            }
            action={
              <Link
                href="/app/automations"
                className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
              >
                Manage
              </Link>
            }
          />

          {!gym.autoRemindersEnabled ? (
            <div className="mt-4 rounded-lg border border-warn-500/25 bg-warn-50 p-3 text-[12.5px] text-warn-700">
              Automations are <strong>paused</strong>. Nothing will be sent until you turn
              them back on in Automations.
            </div>
          ) : null}

          {upcoming.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Queue is clear"
                body="No members match your automation rules over the next week."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {upcoming.slice(0, 7).map((u, i) => (
                <li
                  key={`${u.ruleName}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                    {u.date.getUTCDate()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{u.ruleName}</p>
                    <p className="truncate text-[11.5px] text-ink-500">
                      {describeRule(u.trigger, 0).replace(/^\d+ days? /, "")} ·{" "}
                      {relativeDayLabel(u.date, tz)}
                    </p>
                  </div>
                  <span className="nums shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    {u.count}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
            <div>
              <dt className="text-[11.5px] text-ink-500">Sent this month</dt>
              <dd className="nums text-lg font-semibold text-ink-900">
                {num(metrics.messagesThisMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ink-500">Failed (7 days)</dt>
              <dd
                className={
                  metrics.failedMessages > 0
                    ? "nums text-lg font-semibold text-bad-600"
                    : "nums text-lg font-semibold text-ink-900"
                }
              >
                {num(metrics.failedMessages)}
              </dd>
            </div>
          </dl>
          {gym.saasPlan && gym.saasPlan.waMessageLimit !== -1 ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11.5px] text-ink-500">
                <span>Monthly message allowance</span>
                <span className="nums">
                  {num(metrics.messagesThisMonth)} / {num(gym.saasPlan.waMessageLimit)}
                </span>
              </div>
              <Meter
                value={metrics.messagesThisMonth}
                max={gym.saasPlan.waMessageLimit}
                tone={
                  metrics.messagesThisMonth / gym.saasPlan.waMessageLimit > 0.9 ? "bad" : "brand"
                }
              />
            </div>
          ) : null}
        </Card>
      </section>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Collections"
            subtitle="Last 6 months"
            action={
              <Badge className="bg-brand-50 text-brand-700 ring-brand-500/20">
                {moneyCompact(revenue.reduce((s, r) => s + r.value, 0))}
              </Badge>
            }
          />
          <div className="mt-4">
            <BarChart data={revenue} format={moneyCompact} height={170} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Joins vs expiries"
            subtitle="Growth against leakage"
            action={
              <Badge
                className={
                  joinsDelta >= 0
                    ? "bg-good-50 text-good-700 ring-good-500/20"
                    : "bg-bad-50 text-bad-700 ring-bad-500/20"
                }
                dot={joinsDelta >= 0 ? "bg-good-500" : "bg-bad-500"}
              >
                {joinsDelta >= 0 ? "+" : ""}
                {joinsDelta} vs last month
              </Badge>
            }
          />
          <div className="mt-4">
            <AreaChart
              data={growth.map((g) => ({ label: g.label, value: g.joins }))}
              height={170}
              tone={1}
              label={`New joins per month: ${growth.map((g) => `${g.label} ${g.joins}`).join(", ")}`}
            />
          </div>
          <ul className="mt-3 flex gap-4 border-t border-ink-100 pt-3 text-[11.5px]">
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-good-500" />
              <span className="text-ink-500">joins</span>
              <span className="nums font-semibold text-ink-900">
                {growth.reduce((s, g) => s + g.joins, 0)}
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-ink-300" />
              <span className="text-ink-500">expiries</span>
              <span className="nums font-semibold text-ink-900">
                {growth.reduce((s, g) => s + g.expiries, 0)}
              </span>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Plan mix" subtitle="What active members are on" />
          <div className="mt-5">
            {planMix.length === 0 ? (
              <EmptyState title="No active plans yet" />
            ) : (
              <Donut
                data={planMix}
                size={132}
                centreValue={num(planMix.reduce((s, p) => s + p.value, 0))}
                centreLabel="members"
              />
            )}
          </div>
        </Card>
      </section>

      {/* ── Retention + attendance ────────────────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr_1.2fr]">
        <Card>
          <CardHeader title="Renewal rate" subtitle="Memberships that ended in the last 30 days" />
          {metrics.renewalRate === null ? (
            <div className="mt-5">
              <EmptyState title="Not enough history" body="Come back once a few plans have run their course." />
            </div>
          ) : (
            <div className="mt-5">
              <p className="nums text-4xl font-semibold tracking-tight text-ink-900">
                {metrics.renewalRate.toFixed(0)}%
              </p>
              <p className="mt-1 text-[13px] text-ink-500">
                {metrics.renewedCount} of {metrics.renewalBase} renewed
              </p>
              <div className="mt-4">
                <Meter
                  value={metrics.renewedCount}
                  max={metrics.renewalBase}
                  tone={
                    metrics.renewalRate >= 70 ? "good" : metrics.renewalRate >= 50 ? "warn" : "bad"
                  }
                />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
                {metrics.renewalRate >= 70
                  ? "Strong. Industry average sits near 50–70%."
                  : metrics.renewalRate >= 50
                    ? "Around industry average. Tighter win-back timing is the fastest lever."
                    : "Below average. Check that your reminder automations are enabled and the copy reads well."}
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Attendance pulse"
            subtitle="Check-ins, last 14 days"
            action={
              <Badge className="bg-ink-100 text-ink-700 ring-ink-400/20">
                {num(checkIns.reduce((s, c) => s + c.value, 0))} visits
              </Badge>
            }
          />
          <div className="mt-4">
            <BarChart data={checkIns} height={150} tone={3} />
          </div>
        </Card>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="At risk — paid up but not showing up"
              subtitle={`No check-in for ${INACTIVITY_RISK_DAYS}+ days. These members churn next, not the expired ones.`}
            />
          </div>
          {atRiskList.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="Everyone's turning up" body="No active member has been quiet for two weeks." />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {atRiskList.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/members/${m.id}`}
                      className="block truncate text-[13.5px] font-medium text-ink-900 hover:text-brand-700"
                    >
                      {m.name}
                    </Link>
                    <p className="truncate text-[11.5px] text-ink-500">
                      last visit{" "}
                      {m.lastCheckInAt ? relativeDayLabel(m.lastCheckInAt, tz) : "never recorded"}
                    </p>
                  </div>
                  <Pill>{m.code}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ── Dues + recent messages ────────────────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="Outstanding dues"
              subtitle={
                metrics.duesTotal === 0
                  ? "Nothing outstanding — nice."
                  : `${money(metrics.duesTotal)} across ${metrics.duesCount} ${plural(metrics.duesCount, "member")}.`
              }
              action={
                <Link
                  href="/app/payments?tab=dues"
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Collect
                </Link>
              }
            />
          </div>
          {duesList.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="All settled" icon={<IconWallet className="size-7" />} />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {duesList.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/members/${m.id}`}
                      className="block truncate text-[13.5px] font-medium text-ink-900 hover:text-brand-700"
                    >
                      {m.name}
                    </Link>
                    <p className="truncate text-[11.5px] text-ink-500">{m.activePlanName ?? "—"}</p>
                  </div>
                  <span className="nums shrink-0 text-[13.5px] font-semibold text-warn-700">
                    {money(m.balanceDue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="Recent WhatsApp activity"
              subtitle="Every message Astryx has sent on your behalf"
              action={
                <Link
                  href="/app/outbox"
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Full log
                </Link>
              }
            />
          </div>
          {recentMessages.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="No messages yet"
                body="Once a member approaches their expiry date, reminders will appear here."
                icon={<IconWhatsApp className="size-7" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentMessages.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span
                    className={
                      m.status === "FAILED"
                        ? "grid size-8 shrink-0 place-items-center rounded-lg bg-bad-50 text-bad-600"
                        : m.status === "SKIPPED"
                          ? "grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"
                          : "grid size-8 shrink-0 place-items-center rounded-lg bg-good-50 text-good-600"
                    }
                  >
                    {m.status === "FAILED" ? (
                      <IconAlert className="size-4" />
                    ) : (
                      <IconWhatsApp className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">
                      {m.member?.name ?? displayPhone(m.toPhone)}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-500">
                      {m.templateKey ?? "manual"} · {relativeDayLabel(m.createdAt, tz)}
                    </p>
                  </div>
                  <Badge
                    className={
                      m.status === "FAILED"
                        ? "bg-bad-50 text-bad-700 ring-bad-500/20"
                        : m.status === "SKIPPED"
                          ? "bg-ink-100 text-ink-600 ring-ink-400/20"
                          : "bg-good-50 text-good-700 ring-good-500/20"
                    }
                  >
                    {m.status.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
