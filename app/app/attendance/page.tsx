import Link from "next/link";
import type { Metadata } from "next";

import { BarChart } from "@/components/charts";
import { CheckInForm } from "@/components/forms/checkin-form";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
  Stat,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconCalendarCheck, IconFlame, IconTrendDown, IconUsers } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { INACTIVITY_RISK_DAYS } from "@/lib/constants";
import { addDays, fmtTime, relativeDayLabel, todayInZone } from "@/lib/dates";
import { num, pct, plural } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { getCheckInSeries } from "@/lib/dashboard";

import { checkInByLookup } from "./actions";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const tomorrow = addDays(today, 1);
  const weekAgo = addDays(today, -7);
  const riskCutoff = addDays(today, -INACTIVITY_RISK_DAYS);

  const [todayList, todayCount, weekCount, activeCount, series, atRisk] = await Promise.all([
    db.checkIn.findMany({
      where: { gymId: gym.id, checkInAt: { gte: today, lt: tomorrow } },
      orderBy: { checkInAt: "desc" },
      take: 40,
      include: {
        member: {
          select: { id: true, name: true, code: true, phone: true, status: true, activePlanName: true },
        },
      },
    }),
    db.checkIn.count({ where: { gymId: gym.id, checkInAt: { gte: today, lt: tomorrow } } }),
    db.checkIn.count({ where: { gymId: gym.id, checkInAt: { gte: weekAgo, lt: tomorrow } } }),
    db.member.count({ where: { gymId: gym.id, status: "ACTIVE" } }),
    getCheckInSeries(gym.id, 14, tz),
    db.member.findMany({
      where: {
        gymId: gym.id,
        status: "ACTIVE",
        expiryDate: { gte: today },
        OR: [{ lastCheckInAt: { lt: riskCutoff } }, { lastCheckInAt: null }],
      },
      orderBy: { lastCheckInAt: "asc" },
      take: 20,
      select: { id: true, code: true, name: true, phone: true, lastCheckInAt: true, expiryDate: true },
    }),
  ]);

  const uniqueToday = new Set(todayList.map((c) => c.member.id)).size;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Attendance"
        subtitle="Check members in, and spot the ones drifting away before their plan expires."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Check-ins today"
          value={num(todayCount)}
          sub={`${num(uniqueToday)} unique ${plural(uniqueToday, "member")}`}
          tone="good"
          icon={<IconCalendarCheck className="size-4" />}
        />
        <Stat
          label="Visits this week"
          value={num(weekCount)}
          sub={`${(weekCount / 7).toFixed(1)} per day average`}
          icon={<IconFlame className="size-4" />}
        />
        <Stat
          label="Active members"
          value={num(activeCount)}
          sub={`${pct(uniqueToday, activeCount)} came in today`}
          icon={<IconUsers className="size-4" />}
        />
        <Stat
          label="Not seen in 14 days"
          value={num(atRisk.length === 20 ? 20 : atRisk.length)}
          sub="paid up but absent — churn risk"
          tone={atRisk.length > 0 ? "warn" : "neutral"}
          icon={<IconTrendDown className="size-4" />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Quick check-in"
              subtitle="Type a member ID, phone number or name and press enter."
            />
            <div className="mt-4">
              <CheckInForm action={checkInByLookup} />
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">
              Tip: the number alone works — typing <code className="font-mono">42</code> finds
              MBR-0042. Expired members are still checked in, but flagged so you can ask them
              to renew on the spot.
            </p>
          </Card>

          <Card>
            <CardHeader title="Daily footfall" subtitle="Last 14 days" />
            <div className="mt-4">
              <BarChart data={series} height={170} tone={3} />
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader
                title="Drifting away"
                subtitle={`Active members with no visit in ${INACTIVITY_RISK_DAYS}+ days. Your inactivity automation is already nudging them.`}
              />
            </div>
            {atRisk.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="Everyone's showing up" body="No active member has gone quiet." />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {atRisk.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/members/${m.id}`}
                        className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
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
        </div>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="Today's check-ins"
              subtitle={todayCount === 0 ? "Nobody has checked in yet today." : `${num(todayCount)} recorded`}
            />
          </div>
          {todayList.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<IconCalendarCheck className="size-8" />}
                title="No check-ins today"
                body="Use the quick check-in box as members arrive."
              />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Time</Th>
                  <Th>Via</Th>
                </tr>
              </thead>
              <tbody>
                {todayList.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/app/members/${c.member.id}`} className="group flex items-center gap-2.5">
                        <Avatar name={c.member.name} size="sm" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-ink-900 group-hover:text-brand-700">
                              {c.member.name}
                            </span>
                            {c.member.status === "EXPIRED" ? (
                              <Badge className="bg-bad-50 text-bad-700 ring-bad-500/20">expired</Badge>
                            ) : null}
                          </span>
                          <span className="block truncate text-[11px] text-ink-500">
                            {displayPhone(c.member.phone)}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-[12.5px]">{c.member.activePlanName ?? "—"}</Td>
                    <Td className="nums text-[12.5px]">{fmtTime(c.checkInAt, tz)}</Td>
                    <Td className="text-[11.5px] text-ink-500">{c.method.toLowerCase()}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
