import Link from "next/link";
import type { Metadata } from "next";

import { BarChart, Donut } from "@/components/charts";
import { Pagination, buildUrl } from "@/components/data-controls";
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
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconDownload, IconRupee, IconWallet, IconWhatsApp } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODE_LABELS, PAYMENT_MODES } from "@/lib/constants";
import { fmtDate, lastMonths, monthBounds, relativeDayLabel, todayInZone } from "@/lib/dates";
import { money, moneyCompact, num, plural } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";
import { getRevenueSeries } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Payments" };

const PAGE_SIZE = 25;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const tab = sp.tab === "dues" ? "dues" : "received";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const month = monthBounds(new Date(), tz);

  const [
    collectedThisMonth,
    collectedAllTime,
    duesAgg,
    duesCount,
    revenue,
    modeMix,
    paymentCount,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { gymId: gym.id, paidAt: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.aggregate({ where: { gymId: gym.id }, _sum: { amount: true } }),
    db.member.aggregate({
      where: { gymId: gym.id, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
      _sum: { balanceDue: true },
    }),
    db.member.count({
      where: { gymId: gym.id, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
    }),
    getRevenueSeries(gym.id, 6, tz),
    Promise.all(
      PAYMENT_MODES.map(async (m) => ({
        label: MODE_LABELS[m],
        value: (
          await db.payment.aggregate({
            where: { gymId: gym.id, mode: m, paidAt: { gte: month.start, lt: month.end } },
            _sum: { amount: true },
          })
        )._sum.amount ?? 0,
      })),
    ),
    db.payment.count({ where: { gymId: gym.id } }),
  ]);

  const duesTotal = duesAgg._sum.balanceDue ?? 0;

  const [payments, paymentsTotal, dues, duesListTotal] = await Promise.all([
    tab === "received"
      ? db.payment.findMany({
          where: { gymId: gym.id },
          orderBy: { paidAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { member: { select: { id: true, name: true, code: true, phone: true } } },
        })
      : Promise.resolve([]),
    tab === "received" ? db.payment.count({ where: { gymId: gym.id } }) : Promise.resolve(0),
    tab === "dues"
      ? db.member.findMany({
          where: { gymId: gym.id, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
          orderBy: { balanceDue: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true, code: true, name: true, phone: true, balanceDue: true,
            activePlanName: true, expiryDate: true, waOptOut: true, totalPaid: true,
          },
        })
      : Promise.resolve([]),
    tab === "dues" ? duesCount : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Payments"
        subtitle="Collections, modes and everything still outstanding."
        action={
          <a
            href="/api/export/payments"
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            <IconDownload className="size-4" />
            Export CSV
          </a>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Collected this month"
          value={money(collectedThisMonth._sum.amount ?? 0)}
          sub={`${num(collectedThisMonth._count)} ${plural(collectedThisMonth._count, "payment")}`}
          tone="good"
          icon={<IconRupee className="size-4" />}
        />
        <Stat
          label="Outstanding dues"
          value={money(duesTotal)}
          sub={`${num(duesCount)} ${plural(duesCount, "member")}`}
          tone={duesTotal > 0 ? "warn" : "neutral"}
          icon={<IconWallet className="size-4" />}
          href="/app/payments?tab=dues"
        />
        <Stat
          label="Collected all time"
          value={moneyCompact(collectedAllTime._sum.amount ?? 0)}
          sub={`${num(paymentCount)} ${plural(paymentCount, "payment")} recorded`}
          tone="brand"
        />
        <Stat
          label="Collection rate"
          value={
            (collectedAllTime._sum.amount ?? 0) + duesTotal === 0
              ? "—"
              : `${Math.round(((collectedAllTime._sum.amount ?? 0) / ((collectedAllTime._sum.amount ?? 0) + duesTotal)) * 100)}%`
          }
          sub="billed vs collected"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Collections" subtitle="Last 6 months" />
          <div className="mt-4">
            <BarChart data={revenue} format={moneyCompact} height={180} />
          </div>
        </Card>
        <Card>
          <CardHeader title="How members pay" subtitle="This month, by mode" />
          <div className="mt-5">
            {modeMix.every((m) => m.value === 0) ? (
              <EmptyState title="No payments this month yet" />
            ) : (
              <Donut
                data={modeMix.filter((m) => m.value > 0)}
                size={132}
                centreValue={moneyCompact(modeMix.reduce((s, m) => s + m.value, 0))}
                centreLabel="this month"
              />
            )}
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { href: "/app/payments?tab=received", label: "Payments received", count: paymentCount },
          { href: "/app/payments?tab=dues", label: "Pending dues", count: duesCount },
        ]}
        current={`/app/payments?tab=${tab}`}
      />

      <Card pad={false}>
        {tab === "received" ? (
          payments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<IconRupee className="size-8" />}
                title="No payments recorded yet"
                body="Payments appear here as soon as you collect one against a membership."
              />
            </div>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Member</Th>
                    <Th>Date</Th>
                    <Th>Mode</Th>
                    <Th>Reference</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <Pill>{p.invoiceNo}</Pill>
                      </Td>
                      <Td>
                        <Link
                          href={`/app/members/${p.member.id}`}
                          className="group flex items-center gap-2.5"
                        >
                          <Avatar name={p.member.name} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-ink-900 group-hover:text-brand-700">
                              {p.member.name}
                            </span>
                            <span className="block font-mono text-[11px] text-ink-400">
                              {p.member.code}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="text-[12.5px]">{fmtDate(p.paidAt)}</Td>
                      <Td>
                        <Badge className="bg-ink-100 text-ink-700 ring-ink-400/20">
                          {MODE_LABELS[p.mode] ?? p.mode}
                        </Badge>
                      </Td>
                      <Td className="truncate text-[12px] text-ink-500">{p.reference ?? "—"}</Td>
                      <Td align="right" className="nums text-[13.5px] font-semibold text-good-700">
                        {money(p.amount)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                base="/app/payments"
                params={{ tab }}
                page={page}
                pageSize={PAGE_SIZE}
                total={paymentsTotal}
              />
            </>
          )
        ) : dues.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconWallet className="size-8" />}
              title="Nothing outstanding"
              body="Every member has paid in full. Enjoy it."
            />
          </div>
        ) : (
          <>
            <div className="border-b border-ink-200 px-4 py-3">
              <CardHeader
                title="Pending dues"
                subtitle={`${money(duesTotal)} across ${num(duesCount)} ${plural(duesCount, "member")}. Work down from the top.`}
              />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Expiry</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Outstanding</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {dues.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Link href={`/app/members/${m.id}`} className="group flex items-center gap-2.5">
                        <Avatar name={m.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink-900 group-hover:text-brand-700">
                            {m.name}
                          </span>
                          <span className="block truncate text-[11.5px] text-ink-500">
                            {displayPhone(m.phone)}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-[13px]">{m.activePlanName ?? "—"}</Td>
                    <Td className="text-[12.5px]">
                      {fmtDate(m.expiryDate)}
                      <span className="block text-[11px] text-ink-500">
                        {relativeDayLabel(m.expiryDate, tz)}
                      </span>
                    </Td>
                    <Td align="right" className="nums text-[13px] text-ink-600">
                      {money(m.totalPaid)}
                    </Td>
                    <Td align="right" className="nums text-[13.5px] font-semibold text-warn-700">
                      {money(m.balanceDue)}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!m.waOptOut ? (
                          <a
                            href={waDeepLink(
                              m.phone,
                              `Hi ${m.name.split(" ")[0]}, a small reminder from ${gym.name} — ${money(m.balanceDue)} is pending on your ${m.activePlanName ?? "membership"}. You can pay by UPI or at the desk. Thank you!`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send a dues reminder on WhatsApp"
                            className="grid size-7 place-items-center rounded-md text-good-600 transition-colors hover:bg-good-50"
                          >
                            <IconWhatsApp className="size-4" />
                          </a>
                        ) : null}
                        <Link
                          href={`/app/members/${m.id}`}
                          className="rounded-md bg-good-50 px-2.5 py-1 text-[12px] font-semibold text-good-700 transition-colors hover:bg-good-100"
                        >
                          Collect
                        </Link>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              base="/app/payments"
              params={{ tab }}
              page={page}
              pageSize={PAGE_SIZE}
              total={duesListTotal}
            />
          </>
        )}
      </Card>
    </div>
  );
}
