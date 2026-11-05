import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { FilterSelect, Pagination, SearchFilters } from "@/components/data-controls";
import {
  Alert,
  Badge,
  Button,
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
import { IconAlert, IconInbox, IconRenew, IconWhatsApp } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { MESSAGE_STATUS } from "@/lib/constants";
import { fmtDateTime, monthBounds, relativeDayLabel } from "@/lib/dates";
import { money, num, plural, truncate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

import { cancelQueued, retryAllFailed, retryMessage } from "./actions";

export const metadata: Metadata = { title: "Message log" };

const PAGE_SIZE = 25;

const STATUS_STYLE: Record<string, string> = {
  QUEUED: "bg-info-50 text-info-700 ring-info-500/20",
  SENT: "bg-good-50 text-good-700 ring-good-500/20",
  DELIVERED: "bg-good-50 text-good-700 ring-good-500/20",
  READ: "bg-brand-50 text-brand-700 ring-brand-500/20",
  FAILED: "bg-bad-50 text-bad-700 ring-bad-500/20",
  SKIPPED: "bg-ink-100 text-ink-600 ring-ink-400/20",
};

/**
 * The complete delivery record.
 *
 * Two jobs: let an owner prove a member *was* contacted (ending every "nobody
 * told me" argument), and surface failures loudly enough to be fixed.
 */
export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const month = monthBounds(new Date(), tz);

  const tab = sp.tab ?? "all";
  const q = sp.q?.trim() ?? "";
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const TAB_WHERE: Record<string, Prisma.MessageLogWhereInput> = {
    all: {},
    queued: { status: "QUEUED" },
    failed: { status: "FAILED" },
    skipped: { status: "SKIPPED" },
  };

  const where: Prisma.MessageLogWhereInput = {
    gymId: gym.id,
    ...(TAB_WHERE[tab] ?? {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { toPhone: { contains: q } },
            { body: { contains: q } },
            { templateKey: { contains: q } },
            { member: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [messages, total, counts, monthStats, costAgg] = await Promise.all([
    db.messageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { member: { select: { id: true, name: true, code: true } } },
    }),
    db.messageLog.count({ where }),
    Promise.all(
      Object.keys(TAB_WHERE).map(async (k) => ({
        key: k,
        count: await db.messageLog.count({ where: { gymId: gym.id, ...TAB_WHERE[k] } }),
      })),
    ),
    db.messageLog.count({
      where: {
        gymId: gym.id,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.aggregate({
      where: { gymId: gym.id, createdAt: { gte: month.start, lt: month.end } },
      _sum: { costPaise: true },
    }),
  ]);

  const countFor = (k: string) => counts.find((c) => c.key === k)?.count ?? 0;
  const failedCount = countFor("failed");
  const deliveryRate =
    countFor("all") - countFor("skipped") - countFor("queued") > 0
      ? Math.round(
          ((countFor("all") - countFor("skipped") - countFor("queued") - failedCount) /
            (countFor("all") - countFor("skipped") - countFor("queued"))) *
            100,
        )
      : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Message log"
        subtitle="Every WhatsApp message Astryx has sent, queued or skipped on your behalf."
        action={
          failedCount > 0 ? (
            <form action={retryAllFailed}>
              <Button type="submit" variant="secondary">
                <IconRenew className="size-4" />
                Retry all failed
              </Button>
            </form>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Sent this month"
          value={num(monthStats)}
          sub="delivered to members"
          tone="good"
          icon={<IconWhatsApp className="size-4" />}
        />
        <Stat
          label="Waiting in queue"
          value={num(countFor("queued"))}
          sub="will send at the scheduled hour"
          icon={<IconInbox className="size-4" />}
        />
        <Stat
          label="Failed"
          value={num(failedCount)}
          sub={deliveryRate !== null ? `${deliveryRate}% delivery rate` : "no sends yet"}
          tone={failedCount > 0 ? "bad" : "neutral"}
          icon={<IconAlert className="size-4" />}
        />
        <Stat
          label="Estimated cost"
          value={money(costAgg._sum.costPaise ?? 0)}
          sub="this month, at provider rates"
          tone="brand"
        />
      </div>

      {gym.waProvider === "sandbox" ? (
        <div className="mb-5">
          <Alert tone="info" title="Sandbox mode">
            Messages are rendered and logged exactly as they would be sent, but not
            delivered to real phones. Connect a WhatsApp provider in Settings to go live.
          </Alert>
        </div>
      ) : null}

      <Tabs
        tabs={[
          { href: "/app/outbox?tab=all", label: "All", count: countFor("all") },
          { href: "/app/outbox?tab=queued", label: "Queued", count: countFor("queued") },
          { href: "/app/outbox?tab=failed", label: "Failed", count: failedCount },
          { href: "/app/outbox?tab=skipped", label: "Skipped", count: countFor("skipped") },
        ]}
        current={`/app/outbox?tab=${tab}`}
      />

      <Card pad={false}>
        <div className="border-b border-ink-200 p-4">
          <SearchFilters
            action="/app/outbox"
            q={q}
            placeholder="Member name, phone or template…"
            hidden={{ tab: tab !== "all" ? tab : undefined }}
          >
            <FilterSelect
              name="status"
              value={statusFilter}
              label="Any status"
              options={MESSAGE_STATUS.map((s) => ({ value: s, label: s.toLowerCase() }))}
            />
          </SearchFilters>
        </div>

        {messages.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconWhatsApp className="size-8" />}
              title={q || statusFilter ? "No messages match" : "No messages yet"}
              body={
                q || statusFilter
                  ? "Try a different search or status."
                  : "Once a member approaches their expiry date, reminders appear here automatically."
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>To</Th>
                  <Th>Message</Th>
                  <Th>Template</Th>
                  <Th>Status</Th>
                  <Th>When</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      {m.member ? (
                        <Link
                          href={`/app/members/${m.member.id}`}
                          className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                        >
                          {m.member.name}
                        </Link>
                      ) : (
                        <span className="text-[13px] text-ink-700">—</span>
                      )}
                      <span className="block text-[11px] text-ink-500">
                        {displayPhone(m.toPhone)}
                      </span>
                    </Td>
                    <Td className="max-w-md">
                      <span className="block text-[12px] leading-relaxed text-ink-600">
                        {truncate(m.body.replace(/\n+/g, " "), 110)}
                      </span>
                      {m.error ? (
                        <span className="mt-0.5 block text-[11px] font-medium text-bad-600">
                          {truncate(m.error, 90)}
                        </span>
                      ) : null}
                      {m.skipReason ? (
                        <span className="mt-0.5 block text-[11px] text-ink-500">
                          {m.skipReason}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {m.templateKey ? <Pill>{m.templateKey}</Pill> : null}
                      <span className="mt-0.5 block text-[10.5px] text-ink-400">
                        {m.kind.toLowerCase()}
                      </span>
                    </Td>
                    <Td>
                      <Badge className={STATUS_STYLE[m.status] ?? ""}>
                        {m.status.toLowerCase()}
                      </Badge>
                      {m.attempts > 1 ? (
                        <span className="nums mt-0.5 block text-[10.5px] text-ink-400">
                          {m.attempts} attempts
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <span className="block text-[12px] text-ink-700">
                        {relativeDayLabel(m.sentAt ?? m.scheduledFor, tz)}
                      </span>
                      <span className="block text-[10.5px] text-ink-400">
                        {fmtDateTime(m.sentAt ?? m.scheduledFor, tz)}
                      </span>
                    </Td>
                    <Td align="right">
                      {m.status === "FAILED" ? (
                        <form action={retryMessage}>
                          <input type="hidden" name="messageId" value={m.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                          >
                            Retry
                          </button>
                        </form>
                      ) : m.status === "QUEUED" ? (
                        <form action={cancelQueued}>
                          <input type="hidden" name="messageId" value={m.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              base="/app/outbox"
              params={{ tab: tab !== "all" ? tab : undefined, q, status: statusFilter }}
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
