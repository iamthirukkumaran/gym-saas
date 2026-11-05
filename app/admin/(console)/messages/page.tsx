import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { BarChart } from "@/components/charts";
import { FilterSelect, Pagination, SearchFilters } from "@/components/data-controls";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
  Stat,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconAlert, IconWhatsApp } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { MESSAGE_STATUS } from "@/lib/constants";
import { fmtDateTime, monthBounds, relativeDayLabel } from "@/lib/dates";
import { money, num, truncate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { getMessageSeries } from "@/lib/platform";

export const metadata: Metadata = { title: "Message delivery" };

const PAGE_SIZE = 30;

const STATUS_STYLE: Record<string, string> = {
  QUEUED: "bg-info-50 text-info-700 ring-info-500/20",
  SENT: "bg-good-50 text-good-700 ring-good-500/20",
  DELIVERED: "bg-good-50 text-good-700 ring-good-500/20",
  READ: "bg-brand-50 text-brand-700 ring-brand-500/20",
  FAILED: "bg-bad-50 text-bad-700 ring-bad-500/20",
  SKIPPED: "bg-ink-100 text-ink-600 ring-ink-400/20",
};

/**
 * Cross-tenant delivery monitoring.
 *
 * This is the screen that tells us whether the core promise of the product is
 * being kept. A spike in failures for one gym is a credentials problem; a
 * spike across all of them is a provider outage.
 */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  await requirePlatform();

  const tab = sp.tab ?? "all";
  const q = sp.q?.trim() ?? "";
  const gymId = sp.gym ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const month = monthBounds();

  const TAB_WHERE: Record<string, Prisma.MessageLogWhereInput> = {
    all: {},
    failed: { status: "FAILED" },
    queued: { status: "QUEUED" },
  };

  const where: Prisma.MessageLogWhereInput = {
    ...(TAB_WHERE[tab] ?? {}),
    ...(gymId ? { gymId } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { toPhone: { contains: q } },
            { templateKey: { contains: q } },
            { body: { contains: q } },
            { member: { name: { contains: q } } },
            { gym: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [messages, total, counts, gyms, series, monthSent, monthFailed, cost, worstGyms] =
    await Promise.all([
      db.messageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          gym: { select: { id: true, name: true, waProvider: true } },
          member: { select: { id: true, name: true } },
        },
      }),
      db.messageLog.count({ where }),
      Promise.all(
        Object.keys(TAB_WHERE).map(async (k) => ({
          key: k,
          count: await db.messageLog.count({ where: TAB_WHERE[k] }),
        })),
      ),
      db.gym.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      getMessageSeries(14),
      db.messageLog.count({
        where: {
          status: { in: ["SENT", "DELIVERED", "READ"] },
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
      db.messageLog.count({
        where: { status: "FAILED", createdAt: { gte: month.start, lt: month.end } },
      }),
      db.messageLog.aggregate({
        where: { createdAt: { gte: month.start, lt: month.end } },
        _sum: { costPaise: true },
      }),
      db.messageLog.groupBy({
        by: ["gymId"],
        where: { status: "FAILED", createdAt: { gte: month.start, lt: month.end } },
        _count: { _all: true },
        orderBy: { _count: { gymId: "desc" } },
        take: 5,
      }),
    ]);

  const countFor = (k: string) => counts.find((c) => c.key === k)?.count ?? 0;
  const gymNames = new Map(gyms.map((g) => [g.id, g.name]));
  const deliveryRate =
    monthSent + monthFailed > 0
      ? Math.round((monthSent / (monthSent + monthFailed)) * 100)
      : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Message delivery"
        subtitle="Every WhatsApp message across every tenant — the product's core promise, monitored."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Sent this month"
          value={num(monthSent)}
          sub="across all tenants"
          tone="good"
          icon={<IconWhatsApp className="size-4" />}
        />
        <Stat
          label="Failed this month"
          value={num(monthFailed)}
          sub={deliveryRate !== null ? `${deliveryRate}% delivery rate` : "no sends yet"}
          tone={monthFailed > 0 ? "bad" : "neutral"}
          icon={<IconAlert className="size-4" />}
        />
        <Stat label="Queued now" value={num(countFor("queued"))} sub="awaiting their send window" />
        <Stat
          label="Provider cost"
          value={money(cost._sum.costPaise ?? 0)}
          sub="this month, estimated"
          tone="brand"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Volume" subtitle="All tenants, last 14 days" />
          <div className="mt-4">
            <BarChart data={series} height={160} tone={3} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Most failures this month"
            subtitle="Usually a credentials or template-approval problem."
          />
          {worstGyms.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No failures" />
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {worstGyms.map((w) => (
                <li key={w.gymId} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/gyms/${w.gymId}`}
                    className="min-w-0 truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                  >
                    {gymNames.get(w.gymId) ?? w.gymId}
                  </Link>
                  <span className="nums shrink-0 text-[13px] font-semibold text-bad-600">
                    {num(w._count._all)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Tabs
        tabs={[
          { href: "/admin/messages?tab=all", label: "All", count: countFor("all") },
          { href: "/admin/messages?tab=failed", label: "Failed", count: countFor("failed") },
          { href: "/admin/messages?tab=queued", label: "Queued", count: countFor("queued") },
        ]}
        current={`/admin/messages?tab=${tab}`}
      />

      <Card pad={false}>
        <div className="border-b border-ink-200 p-4">
          <SearchFilters
            action="/admin/messages"
            q={q}
            placeholder="Gym, member, phone or template…"
            hidden={{ tab: tab !== "all" ? tab : undefined }}
          >
            <FilterSelect
              name="gym"
              value={gymId}
              label="All gyms"
              options={gyms.map((g) => ({ value: g.id, label: g.name }))}
            />
            <FilterSelect
              name="status"
              value={status}
              label="Any status"
              options={MESSAGE_STATUS.map((s) => ({ value: s, label: s.toLowerCase() }))}
            />
          </SearchFilters>
        </div>

        {messages.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconWhatsApp className="size-8" />}
              title="No messages match"
              body="Try clearing the filters."
            />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Gym</Th>
                  <Th>Recipient</Th>
                  <Th>Message</Th>
                  <Th>Template</Th>
                  <Th>Provider</Th>
                  <Th>Status</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Link
                        href={`/admin/gyms/${m.gym.id}`}
                        className="block max-w-32 truncate text-[12.5px] font-medium text-ink-900 hover:text-brand-700"
                      >
                        {m.gym.name}
                      </Link>
                    </Td>
                    <Td>
                      <span className="block max-w-32 truncate text-[12.5px] text-ink-800">
                        {m.member?.name ?? "—"}
                      </span>
                      <span className="block text-[11px] text-ink-500">
                        {displayPhone(m.toPhone)}
                      </span>
                    </Td>
                    <Td className="max-w-xs">
                      <span className="block text-[11.5px] leading-relaxed text-ink-600">
                        {truncate(m.body.replace(/\n+/g, " "), 80)}
                      </span>
                      {m.error ? (
                        <span className="mt-0.5 block text-[11px] font-medium text-bad-600">
                          {truncate(m.error, 70)}
                        </span>
                      ) : null}
                    </Td>
                    <Td>{m.templateKey ? <Pill>{m.templateKey}</Pill> : null}</Td>
                    <Td className="text-[11.5px] text-ink-500">{m.provider}</Td>
                    <Td>
                      <Badge className={STATUS_STYLE[m.status] ?? ""}>
                        {m.status.toLowerCase()}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="block text-[11.5px] text-ink-700">
                        {relativeDayLabel(m.sentAt ?? m.createdAt)}
                      </span>
                      <span className="block text-[10.5px] text-ink-400">
                        {fmtDateTime(m.sentAt ?? m.createdAt)}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              base="/admin/messages"
              params={{ tab: tab !== "all" ? tab : undefined, q, gym: gymId, status }}
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
