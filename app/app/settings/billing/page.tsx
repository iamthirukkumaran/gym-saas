import type { Metadata } from "next";

import { Meter } from "@/components/charts";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Pill,
  Row,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, monthBounds, relativeDayLabel } from "@/lib/dates";
import { money, num } from "@/lib/format";

export const metadata: Metadata = { title: "Subscription" };

export default async function BillingSettingsPage() {
  const { gym } = await requireStaff();
  const month = monthBounds(new Date(), gym.timezone);

  const [subscription, invoices, allPlans, memberCount, staffCount, messagesThisMonth] =
    await Promise.all([
      db.subscription.findFirst({
        where: { gymId: gym.id },
        orderBy: { createdAt: "desc" },
        include: { plan: true },
      }),
      db.saasInvoice.findMany({
        where: { gymId: gym.id },
        orderBy: { issuedAt: "desc" },
        take: 12,
      }),
      db.saasPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      db.member.count({ where: { gymId: gym.id, status: { not: "CANCELLED" } } }),
      db.staffUser.count({ where: { gymId: gym.id, active: true } }),
      db.messageLog.count({
        where: {
          gymId: gym.id,
          status: { in: ["SENT", "DELIVERED", "READ", "QUEUED"] },
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
    ]);

  const plan = subscription?.plan ?? gym.saasPlan;
  const features: string[] = plan ? JSON.parse(plan.featuresJson) : [];

  const usage = [
    { label: "Members", used: memberCount, limit: plan?.memberLimit ?? -1 },
    { label: "Staff logins", used: staffCount, limit: plan?.staffLimit ?? -1 },
    { label: "WhatsApp messages this month", used: messagesThisMonth, limit: plan?.waMessageLimit ?? -1 },
  ];

  return (
    <div className="space-y-5">
      {gym.status === "TRIAL" && gym.trialEndsAt ? (
        <Alert tone="info" title={`Free trial ends ${relativeDayLabel(gym.trialEndsAt, gym.timezone)}`}>
          Nothing stops working when it ends — Astryx will contact you to set up payment.
        </Alert>
      ) : gym.status === "PAST_DUE" ? (
        <Alert tone="warn" title="A subscription payment is overdue">
          Automations keep running for now. Please settle the invoice below to avoid
          interruption.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Your subscription"
          action={
            <Badge
              className={
                gym.status === "ACTIVE"
                  ? "bg-good-50 text-good-700 ring-good-500/20"
                  : gym.status === "TRIAL"
                    ? "bg-info-50 text-info-700 ring-info-500/20"
                    : "bg-warn-50 text-warn-700 ring-warn-500/25"
              }
            >
              {gym.status.replace("_", " ").toLowerCase()}
            </Badge>
          }
        />

        {!plan ? (
          <div className="mt-4">
            <EmptyState title="No plan assigned" body="Contact Astryx support to set one up." />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-ink-900">{plan.name}</p>
                <p className="text-[13px] text-ink-500">{plan.tagline}</p>
              </div>
              <p className="nums text-2xl font-semibold text-ink-900">
                {money(
                  subscription?.billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly,
                )}
                <span className="text-sm font-normal text-ink-500">
                  /{subscription?.billingCycle === "YEARLY" ? "year" : "month"}
                </span>
              </p>
            </div>

            <dl className="mt-4 border-t border-ink-100 pt-3">
              <Row label="Billing cycle" value={subscription?.billingCycle.toLowerCase() ?? "monthly"} />
              <Row
                label="Current period"
                value={
                  subscription
                    ? `${fmtDate(subscription.currentPeriodStart)} → ${fmtDate(subscription.currentPeriodEnd)}`
                    : "—"
                }
              />
              <Row
                label="Renews"
                value={
                  subscription
                    ? relativeDayLabel(subscription.currentPeriodEnd, gym.timezone)
                    : "—"
                }
              />
            </dl>

            <ul className="mt-4 grid gap-2 border-t border-ink-100 pt-4 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink-700">
                  <IconCheck className="mt-0.5 size-3.5 shrink-0 text-good-600" />
                  {f}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="Usage against your plan" subtitle="Updated live." />
        <div className="mt-4 space-y-4">
          {usage.map((u) => (
            <div key={u.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-ink-700">{u.label}</span>
                <span className="nums text-[13px] font-medium text-ink-900">
                  {num(u.used)}
                  <span className="text-ink-400">
                    {" / "}
                    {u.limit === -1 ? "unlimited" : num(u.limit)}
                  </span>
                </span>
              </div>
              <Meter
                value={u.used}
                max={u.limit === -1 ? Math.max(u.used, 1) : u.limit}
                tone={
                  u.limit === -1
                    ? "good"
                    : u.used / u.limit > 0.9
                      ? "bad"
                      : u.used / u.limit > 0.7
                        ? "warn"
                        : "brand"
                }
              />
            </div>
          ))}
        </div>
      </Card>

      {allPlans.length > 0 ? (
        <Card>
          <CardHeader
            title="Other plans"
            subtitle="To change plan, reply to any Astryx message — we'll switch it without downtime."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {allPlans.map((p) => {
              const current = p.id === plan?.id;
              return (
                <div
                  key={p.id}
                  className={
                    current
                      ? "rounded-xl border-2 border-brand-500 bg-brand-50 p-4"
                      : "rounded-xl border border-ink-200 p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-ink-900">{p.name}</p>
                    {current ? (
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-500/20">current</Badge>
                    ) : null}
                  </div>
                  <p className="nums mt-1 text-lg font-semibold text-ink-900">
                    {money(p.priceMonthly)}
                    <span className="text-[12px] font-normal text-ink-500">/mo</span>
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11.5px] text-ink-600">
                    <li>{p.memberLimit === -1 ? "Unlimited members" : `${num(p.memberLimit)} members`}</li>
                    <li>{num(p.staffLimit)} staff logins</li>
                    <li>
                      {p.waMessageLimit === -1
                        ? "Unlimited messages"
                        : `${num(p.waMessageLimit)} messages/month`}
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card pad={false}>
        <div className="p-5 pb-2">
          <CardHeader title="Invoices" subtitle="Your Astryx subscription billing history." />
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No invoices yet" body="Your first invoice appears after the trial." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Issued</Th>
                <Th>Due</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <Tr key={inv.id}>
                  <Td>
                    <Pill>{inv.number}</Pill>
                  </Td>
                  <Td className="text-[12.5px]">{fmtDate(inv.issuedAt)}</Td>
                  <Td className="text-[12.5px]">{fmtDate(inv.dueAt)}</Td>
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
                            : "bg-warn-50 text-warn-700 ring-warn-500/25"
                      }
                    >
                      {inv.status.toLowerCase()}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
