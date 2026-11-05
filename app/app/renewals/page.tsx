import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { Pagination, buildUrl } from "@/components/data-controls";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Pill,
  Stat,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconRenew, IconWhatsApp, IconZap } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fmtDate, relativeDayLabel, todayInZone } from "@/lib/dates";
import { money, num, plural } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";
import { daysRemaining } from "@/lib/status";

export const metadata: Metadata = { title: "Renewals" };

const PAGE_SIZE = 25;

/**
 * The renewal work queue.
 *
 * Deliberately separate from the members list: this is a *to-do list*, ordered
 * by urgency, not a directory. An owner opens this, works top to bottom, and
 * closes it.
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const tab = sp.tab ?? "week";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const RANGES: Record<string, Prisma.MemberWhereInput> = {
    week: { status: "ACTIVE", expiryDate: { gte: today, lte: addDays(today, 7) } },
    month: { status: "ACTIVE", expiryDate: { gte: today, lte: addDays(today, 30) } },
    expired: { status: "EXPIRED", expiryDate: { gte: addDays(today, -30), lt: today } },
    dormant: { status: "EXPIRED", expiryDate: { lt: addDays(today, -30) } },
  };

  const where: Prisma.MemberWhereInput = { gymId: gym.id, ...(RANGES[tab] ?? RANGES.week) };

  const [rows, total, counts] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: tab.startsWith("exp") || tab === "dormant"
        ? { expiryDate: "desc" }
        : { expiryDate: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, code: true, name: true, phone: true, expiryDate: true,
        activePlanName: true, balanceDue: true, waOptOut: true, lastMessageAt: true,
        _count: { select: { messages: true } },
      },
    }),
    db.member.count({ where }),
    Promise.all(
      Object.entries(RANGES).map(async ([key, w]) => ({
        key,
        count: await db.member.count({ where: { gymId: gym.id, ...w } }),
      })),
    ),
  ]);

  const countFor = (k: string) => counts.find((c) => c.key === k)?.count ?? 0;

  // Value at stake, so the queue reads as money rather than a chore list.
  const atStake = await db.member.aggregate({
    where,
    _sum: { balanceDue: true },
  });
  const planPrices = await db.membershipPlan.findMany({
    where: { gymId: gym.id, active: true },
    select: { price: true },
  });
  const avgPlan = planPrices.length
    ? Math.round(planPrices.reduce((s, p) => s + p.price, 0) / planPrices.length)
    : 0;

  const TABS = [
    { href: "/app/renewals?tab=week", label: "Next 7 days", count: countFor("week") },
    { href: "/app/renewals?tab=month", label: "Next 30 days", count: countFor("month") },
    { href: "/app/renewals?tab=expired", label: "Recently expired", count: countFor("expired") },
    { href: "/app/renewals?tab=dormant", label: "Dormant (30d+)", count: countFor("dormant") },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Renewals"
        subtitle="Your renewal queue, ordered by urgency. Astryx is already messaging these members."
        action={
          <LinkButton href="/app/automations" variant="secondary">
            <IconZap className="size-4" />
            Automation settings
          </LinkButton>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Expiring in 7 days"
          value={num(countFor("week"))}
          sub="act on these first"
          tone={countFor("week") > 0 ? "warn" : "neutral"}
          icon={<IconRenew className="size-4" />}
        />
        <Stat label="Expiring in 30 days" value={num(countFor("month"))} sub="plan ahead" />
        <Stat
          label="Recently expired"
          value={num(countFor("expired"))}
          sub="win-back window is open"
          tone={countFor("expired") > 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Revenue at stake"
          value={money(total * avgPlan)}
          sub={`${num(total)} ${plural(total, "member")} × avg plan ${money(avgPlan)}`}
          tone="brand"
        />
      </div>

      <Tabs tabs={TABS} current={`/app/renewals?tab=${tab}`} />

      <Card pad={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconZap className="size-8" />}
              title={
                tab === "week"
                  ? "Nothing expires in the next 7 days"
                  : tab === "expired"
                    ? "No one expired in the last 30 days"
                    : "Nothing in this view"
              }
              body="Astryx keeps watching — the next batch will appear here automatically."
            />
          </div>
        ) : (
          <>
            <div className="border-b border-ink-200 px-4 py-3">
              <CardHeader
                title={TABS.find((t) => t.href.endsWith(tab))?.label ?? "Renewals"}
                subtitle={`${num(total)} ${plural(total, "member")} · ${money(atStake._sum.balanceDue ?? 0)} in unpaid dues across this list`}
              />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>{tab === "expired" || tab === "dormant" ? "Expired" : "Expires"}</Th>
                  <Th align="right">Dues</Th>
                  <Th>Reminders</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const left = daysRemaining(m.expiryDate, tz) ?? 0;
                  const firstName = m.name.split(" ")[0];
                  const msg =
                    left < 0
                      ? `Hi ${firstName}, your ${gym.name} membership ended on ${fmtDate(m.expiryDate)}. Shall we get you back in? I can renew it right away.`
                      : `Hi ${firstName}, your ${gym.name} membership expires on ${fmtDate(m.expiryDate)}. Want me to renew it for you?`;

                  return (
                    <Tr key={m.id}>
                      <Td>
                        <Link href={`/app/members/${m.id}`} className="group flex items-center gap-3">
                          <Avatar name={m.name} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-ink-900 group-hover:text-brand-700">
                              {m.name}
                            </span>
                            <span className="block truncate text-[11.5px] text-ink-500">
                              {displayPhone(m.phone)}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="text-[13px]">{m.activePlanName ?? "—"}</Td>
                      <Td>
                        <span className="block text-[13px] text-ink-800">{fmtDate(m.expiryDate)}</span>
                        <span
                          className={
                            left < 0
                              ? "text-[11px] font-semibold text-bad-600"
                              : left <= 3
                                ? "text-[11px] font-semibold text-warn-600"
                                : "text-[11px] text-ink-500"
                          }
                        >
                          {relativeDayLabel(m.expiryDate, tz)}
                        </span>
                      </Td>
                      <Td align="right" className="nums text-[13px]">
                        {m.balanceDue > 0 ? (
                          <span className="font-semibold text-warn-700">{money(m.balanceDue)}</span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </Td>
                      <Td>
                        {m.waOptOut ? (
                          <Badge className="bg-ink-100 text-ink-600 ring-ink-400/20">opted out</Badge>
                        ) : m.lastMessageAt ? (
                          <span className="text-[12px] text-ink-600">
                            sent {relativeDayLabel(m.lastMessageAt, tz)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-400">queued</span>
                        )}
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!m.waOptOut ? (
                            <a
                              href={waDeepLink(m.phone, msg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open WhatsApp with a ready message"
                              className="grid size-7 place-items-center rounded-md text-good-600 transition-colors hover:bg-good-50"
                            >
                              <IconWhatsApp className="size-4" />
                            </a>
                          ) : null}
                          <Link
                            href={`/app/members/${m.id}/renew`}
                            className="rounded-md bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
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
            <Pagination
              base="/app/renewals"
              params={{ tab }}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
            />
          </>
        )}
      </Card>
    </div>
  );
}
