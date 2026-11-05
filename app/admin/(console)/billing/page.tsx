import Link from "next/link";
import type { Metadata } from "next";

import { BarChart, Donut } from "@/components/charts";
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
import { IconAlert, IconRupee } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, relativeDayLabel } from "@/lib/dates";
import { money, moneyCompact, num, plural } from "@/lib/format";
import { getMrr, getPlatformRevenueSeries } from "@/lib/platform";

import { markInvoicePaid } from "../../actions";

export const metadata: Metadata = { title: "Billing" };

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const { user } = await requirePlatform();
  const tab = sp.tab === "all" ? "all" : "unpaid";

  const [mrr, revenue, invoices, unpaidCount, allCount, collectedAll, byPlan] =
    await Promise.all([
      getMrr(),
      getPlatformRevenueSeries(6),
      db.saasInvoice.findMany({
        where: tab === "unpaid" ? { status: { in: ["DUE", "OVERDUE"] } } : {},
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 60,
        include: { gym: { select: { id: true, name: true, status: true } } },
      }),
      db.saasInvoice.count({ where: { status: { in: ["DUE", "OVERDUE"] } } }),
      db.saasInvoice.count(),
      db.saasInvoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
      db.saasPlan.findMany({
        select: {
          name: true,
          priceMonthly: true,
          _count: { select: { subscriptions: true } },
          subscriptions: {
            where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
            select: { amount: true, billingCycle: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  const planMrr = byPlan.map((p) => ({
    label: p.name,
    value: p.subscriptions.reduce(
      (s, sub) => s + (sub.billingCycle === "YEARLY" ? Math.round(sub.amount / 12) : sub.amount),
      0,
    ),
  }));

  const outstanding = invoices
    .filter((i) => i.status === "DUE" || i.status === "OVERDUE")
    .reduce((s, i) => s + i.total, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Billing"
        subtitle="Astryx's own revenue: recurring, collected and outstanding."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="MRR"
          value={money(mrr.mrr)}
          sub={`${num(mrr.payingCount)} paying ${plural(mrr.payingCount, "tenant")}`}
          tone="brand"
          icon={<IconRupee className="size-4" />}
        />
        <Stat label="ARR" value={moneyCompact(mrr.arr)} sub="annualised run rate" tone="good" />
        <Stat
          label="At risk"
          value={money(mrr.atRisk)}
          sub="MRR on past-due accounts"
          tone={mrr.atRisk > 0 ? "bad" : "neutral"}
          icon={<IconAlert className="size-4" />}
        />
        <Stat
          label="Collected all time"
          value={moneyCompact(collectedAll._sum.total ?? 0)}
          sub={`${num(allCount)} invoices raised`}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Revenue collected" subtitle="Paid invoices, last 6 months" />
          <div className="mt-4">
            <BarChart data={revenue} format={moneyCompact} height={180} />
          </div>
        </Card>
        <Card>
          <CardHeader title="MRR by plan" subtitle="Where the recurring revenue sits" />
          <div className="mt-5">
            {planMrr.every((p) => p.value === 0) ? (
              <EmptyState title="No paying tenants yet" />
            ) : (
              <Donut
                data={planMrr.filter((p) => p.value > 0)}
                size={128}
                centreValue={moneyCompact(mrr.mrr)}
                centreLabel="MRR"
              />
            )}
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { href: "/admin/billing?tab=unpaid", label: "Unpaid", count: unpaidCount },
          { href: "/admin/billing?tab=all", label: "All invoices", count: allCount },
        ]}
        current={`/admin/billing?tab=${tab}`}
      />

      <Card pad={false}>
        {invoices.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconRupee className="size-8" />}
              title={tab === "unpaid" ? "Everything is paid" : "No invoices yet"}
              body={tab === "unpaid" ? "No outstanding subscription invoices." : undefined}
            />
          </div>
        ) : (
          <>
            {tab === "unpaid" ? (
              <div className="border-b border-ink-200 px-4 py-3">
                <CardHeader
                  title="Outstanding"
                  subtitle={`${money(outstanding)} across ${num(invoices.length)} ${plural(invoices.length, "invoice")}.`}
                />
              </div>
            ) : null}
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Gym</Th>
                  <Th>Issued</Th>
                  <Th>Due</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  {user.role === "SUPERADMIN" ? <Th align="right" /> : null}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>
                      <Pill>{inv.number}</Pill>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/gyms/${inv.gym.id}`}
                        className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                      >
                        {inv.gym.name}
                      </Link>
                      <span className="block text-[11px] text-ink-500">
                        {inv.gym.status.replace("_", " ").toLowerCase()}
                      </span>
                    </Td>
                    <Td className="text-[12.5px]">{fmtDate(inv.issuedAt)}</Td>
                    <Td className="text-[12.5px]">
                      {fmtDate(inv.dueAt)}
                      {inv.status !== "PAID" ? (
                        <span className="block text-[11px] text-ink-500">
                          {relativeDayLabel(inv.dueAt)}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right" className="nums text-[13px] font-medium">
                      {money(inv.total)}
                      <span className="block text-[10.5px] font-normal text-ink-400">
                        incl. {money(inv.tax)} GST
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        className={
                          inv.status === "PAID"
                            ? "bg-good-50 text-good-700 ring-good-500/20"
                            : inv.status === "OVERDUE"
                              ? "bg-bad-50 text-bad-700 ring-bad-500/20"
                              : inv.status === "VOID"
                                ? "bg-ink-100 text-ink-500 ring-ink-400/20"
                                : "bg-warn-50 text-warn-700 ring-warn-500/25"
                        }
                      >
                        {inv.status.toLowerCase()}
                      </Badge>
                    </Td>
                    {user.role === "SUPERADMIN" ? (
                      <Td align="right">
                        {inv.status !== "PAID" && inv.status !== "VOID" ? (
                          <form action={markInvoicePaid}>
                            <input type="hidden" name="invoiceId" value={inv.id} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                            >
                              Mark paid
                            </button>
                          </form>
                        ) : inv.paidAt ? (
                          <span className="text-[11px] text-ink-400">
                            {fmtDate(inv.paidAt)}
                          </span>
                        ) : null}
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
}
