import Link from "next/link";
import type { Metadata } from "next";

import { AreaChart, BarChart, Donut } from "@/components/charts";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  Stat,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import {
  IconAlert,
  IconBuilding,
  IconPlus,
  IconRupee,
  IconUsers,
  IconWhatsApp,
  IconZap,
} from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, relativeDayLabel } from "@/lib/dates";
import { money, moneyCompact, num, plural } from "@/lib/format";
import {
  getAttentionList,
  getMessageSeries,
  getPlatformMetrics,
  getPlatformRevenueSeries,
  getSignupSeries,
} from "@/lib/platform";

export const metadata: Metadata = { title: "Platform overview" };

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { user } = await requirePlatform();

  const [metrics, signups, revenue, messages, attention, recentGyms, planMix] =
    await Promise.all([
      getPlatformMetrics(),
      getSignupSeries(6),
      getPlatformRevenueSeries(6),
      getMessageSeries(14),
      getAttentionList(),
      db.gym.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          saasPlan: { select: { name: true } },
          _count: { select: { members: true } },
        },
      }),
      db.saasPlan.findMany({
        select: { name: true, _count: { select: { gyms: true } } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  const attentionCount =
    attention.endingTrials.length +
    attention.overdue.length +
    attention.automationsOff.length +
    attention.noMembers.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {error === "forbidden" ? (
        <Alert tone="warn" title="Superadmin only">
          Your support account can view everything but not change tenants or billing.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Platform overview
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every tenant, the revenue they generate, and who needs a call today.
          </p>
        </div>
        {user.role === "SUPERADMIN" ? (
          <LinkButton href="/admin/gyms/new">
            <IconPlus className="size-4" />
            Provision a gym
          </LinkButton>
        ) : null}
      </div>

      {/* ── Business metrics ──────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="MRR"
          value={moneyCompact(metrics.mrr)}
          sub={`${moneyCompact(metrics.arr)} ARR`}
          tone="brand"
          icon={<IconRupee className="size-4" />}
          href="/admin/billing"
        />
        <Stat
          label="Paying gyms"
          value={num(metrics.activeGyms)}
          sub={`${num(metrics.totalGyms)} total tenants`}
          tone="good"
          icon={<IconBuilding className="size-4" />}
          href="/admin/gyms"
        />
        <Stat
          label="On trial"
          value={num(metrics.trialGyms)}
          sub={`${num(metrics.trialsEndingSoon)} ending in 7 days`}
          tone={metrics.trialsEndingSoon > 0 ? "warn" : "neutral"}
          href="/admin/gyms?status=TRIAL"
        />
        <Stat
          label="Revenue at risk"
          value={moneyCompact(metrics.atRisk + metrics.unpaidTotal)}
          sub={`${num(metrics.pastDueGyms)} past due · ${num(metrics.unpaidCount)} unpaid invoices`}
          tone={metrics.pastDueGyms > 0 ? "bad" : "neutral"}
          icon={<IconAlert className="size-4" />}
          href="/admin/billing"
        />
        <Stat
          label="Members managed"
          value={num(metrics.totalMembers)}
          sub={`${num(metrics.activeMembers)} currently active`}
          icon={<IconUsers className="size-4" />}
        />
        <Stat
          label="Messages this month"
          value={num(metrics.messagesThisMonth)}
          sub={`${num(metrics.failedThisMonth)} failed`}
          tone={metrics.failedThisMonth > 0 ? "warn" : "neutral"}
          icon={<IconWhatsApp className="size-4" />}
          href="/admin/messages"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-ink-500">
              Payments our tenants collected this month
            </p>
            <p className="nums mt-1 text-3xl font-semibold tracking-tight text-ink-900">
              {money(metrics.gmvThisMonth)}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-500">
              The value Astryx is helping gyms capture. Keep this number far larger than MRR
              and churn stays low.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-medium text-ink-500">Astryx take rate</p>
            <p className="nums mt-1 text-3xl font-semibold tracking-tight text-brand-700">
              {metrics.gmvThisMonth > 0
                ? `${((metrics.mrr / metrics.gmvThisMonth) * 100).toFixed(1)}%`
                : "—"}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-500">of what they collect</p>
          </div>
        </div>
      </Card>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Platform revenue" subtitle="Paid invoices, last 6 months" />
          <div className="mt-4">
            <BarChart data={revenue} format={moneyCompact} height={170} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="New tenants"
            subtitle="Signups per month"
            action={
              <Badge className="bg-good-50 text-good-700 ring-good-500/20">
                +{metrics.newGymsThisMonth} this month
              </Badge>
            }
          />
          <div className="mt-4">
            <AreaChart data={signups} height={170} tone={1} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Plan distribution" subtitle="Tenants per subscription plan" />
          <div className="mt-5">
            {planMix.every((p) => p._count.gyms === 0) ? (
              <EmptyState title="No tenants yet" />
            ) : (
              <Donut
                data={planMix.map((p) => ({ label: p.name, value: p._count.gyms }))}
                size={128}
                centreValue={num(metrics.totalGyms)}
                centreLabel="gyms"
              />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="WhatsApp volume"
          subtitle="Messages across all tenants, last 14 days — watch this against provider rate limits."
        />
        <div className="mt-4">
          <BarChart data={messages} height={150} tone={3} />
        </div>
      </Card>

      {/* ── Needs attention ──────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="Needs attention"
              subtitle={
                attentionCount === 0
                  ? "Nothing to chase. Every tenant looks healthy."
                  : `${attentionCount} ${plural(attentionCount, "account")} worth a call today.`
              }
            />
          </div>

          {attentionCount === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="All clear" icon={<IconZap className="size-7" />} />
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {attention.endingTrials.length > 0 ? (
                <AttentionGroup
                  title="Trials ending in 7 days"
                  tone="warn"
                  items={attention.endingTrials.map((g) => ({
                    id: g.id,
                    name: g.name,
                    detail: `${num(g._count.members)} members · trial ends ${relativeDayLabel(g.trialEndsAt)}`,
                  }))}
                />
              ) : null}
              {attention.overdue.length > 0 ? (
                <AttentionGroup
                  title="Payment overdue"
                  tone="bad"
                  items={attention.overdue.map((g) => ({
                    id: g.id,
                    name: g.name,
                    detail: `${g.status.replace("_", " ").toLowerCase()} · ${num(g._count.members)} members`,
                  }))}
                />
              ) : null}
              {attention.automationsOff.length > 0 ? (
                <AttentionGroup
                  title="Automations switched off"
                  tone="warn"
                  items={attention.automationsOff.map((g) => ({
                    id: g.id,
                    name: g.name,
                    detail: `${num(g._count.members)} members getting no reminders — churn risk`,
                  }))}
                />
              ) : null}
              {attention.noMembers.length > 0 ? (
                <AttentionGroup
                  title="Never onboarded"
                  tone="neutral"
                  items={attention.noMembers.map((g) => ({
                    id: g.id,
                    name: g.name,
                    detail: `signed up ${relativeDayLabel(g.createdAt)}, still zero members`,
                  }))}
                />
              ) : null}
            </div>
          )}
        </Card>

        <Card pad={false}>
          <div className="p-5 pb-2">
            <CardHeader
              title="Newest tenants"
              action={
                <Link
                  href="/admin/gyms"
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  All gyms
                </Link>
              }
            />
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Gym</Th>
                <Th>Plan</Th>
                <Th align="right">Members</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {recentGyms.map((g) => (
                <Tr key={g.id}>
                  <Td>
                    <Link
                      href={`/admin/gyms/${g.id}`}
                      className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
                    >
                      {g.name}
                    </Link>
                    <span className="block truncate text-[11px] text-ink-500">
                      {g.city ?? "—"}
                    </span>
                  </Td>
                  <Td className="text-[12.5px]">{g.saasPlan?.name ?? "—"}</Td>
                  <Td align="right" className="nums text-[13px]">
                    {num(g._count.members)}
                  </Td>
                  <Td>
                    <GymStatusBadge status={g.status} />
                  </Td>
                  <Td className="text-[12px] text-ink-500">{fmtDate(g.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function AttentionGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "warn" | "bad" | "neutral";
  items: { id: string; name: string; detail: string }[];
}) {
  const dot =
    tone === "bad" ? "bg-bad-500" : tone === "warn" ? "bg-warn-500" : "bg-ink-300";
  return (
    <div className="px-5 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/gyms/${i.id}`}
                className="block truncate text-[13px] font-medium text-ink-900 hover:text-brand-700"
              >
                {i.name}
              </Link>
              <p className="truncate text-[11.5px] text-ink-500">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GymStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-good-50 text-good-700 ring-good-500/20",
    TRIAL: "bg-info-50 text-info-700 ring-info-500/20",
    PAST_DUE: "bg-warn-50 text-warn-700 ring-warn-500/25",
    SUSPENDED: "bg-bad-50 text-bad-700 ring-bad-500/20",
    CANCELLED: "bg-ink-100 text-ink-600 ring-ink-400/20",
  };
  return (
    <Badge className={styles[status] ?? styles.CANCELLED}>
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}
