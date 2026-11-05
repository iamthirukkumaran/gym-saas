import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BarChart, Meter } from "@/components/charts";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  Pill,
  Row,
  Select,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconAlert, IconExternal, IconShield, IconWhatsApp, IconZap } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { GYM_STATUS, ROLE_LABELS } from "@/lib/constants";
import { addDays, fmtDate, fmtDateTime, lastMonths, monthBounds, relativeDayLabel, todayInZone } from "@/lib/dates";
import { money, moneyCompact, num, plural } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { getProvider } from "@/lib/whatsapp";

import {
  changeGymPlan,
  extendTrial,
  impersonateGym,
  markInvoicePaid,
  setGymStatus,
} from "../../../actions";
import { GymStatusBadge } from "../../page";

export const metadata: Metadata = { title: "Gym" };

export default async function AdminGymDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const { id } = await params;
  const { created, error } = await searchParams;
  const { user } = await requirePlatform();
  const isSuper = user.role === "SUPERADMIN";

  const gym = await db.gym.findUnique({
    where: { id },
    include: {
      saasPlan: true,
      staff: { orderBy: [{ active: "desc" }, { role: "asc" }] },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
      invoices: { orderBy: { issuedAt: "desc" }, take: 8 },
      _count: {
        select: { members: true, messages: true, payments: true, rules: true, templates: true },
      },
    },
  });
  if (!gym) notFound();

  const tz = gym.timezone;
  const today = todayInZone(tz);
  const month = monthBounds(new Date(), tz);

  const [
    activeMembers,
    expiringMembers,
    expiredMembers,
    collectedThisMonth,
    messagesThisMonth,
    failedMessages,
    enabledRules,
    allPlans,
    lastActivity,
    auditLog,
  ] = await Promise.all([
    db.member.count({ where: { gymId: gym.id, status: "ACTIVE" } }),
    db.member.count({
      where: { gymId: gym.id, status: "ACTIVE", expiryDate: { gte: today, lte: addDays(today, 7) } },
    }),
    db.member.count({ where: { gymId: gym.id, status: "EXPIRED" } }),
    db.payment.aggregate({
      where: { gymId: gym.id, paidAt: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    db.messageLog.count({
      where: {
        gymId: gym.id,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.count({
      where: { gymId: gym.id, status: "FAILED", createdAt: { gte: addDays(today, -30) } },
    }),
    db.reminderRule.count({ where: { gymId: gym.id, enabled: true } }),
    db.saasPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.messageLog.findFirst({
      where: { gymId: gym.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.auditLog.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  // Member growth inside this tenant — the clearest signal of whether they're
  // actually using the product.
  const buckets = lastMonths(6, tz);
  const growth = await Promise.all(
    buckets.map(async (b) => ({
      label: b.label,
      value: await db.member.count({
        where: { gymId: gym.id, joinDate: { gte: b.start, lt: b.end } },
      }),
    })),
  );

  const sub = gym.subscriptions[0];
  const mrr = sub
    ? sub.billingCycle === "YEARLY"
      ? Math.round(sub.amount / 12)
      : sub.amount
    : 0;
  const provider = getProvider(gym.waProvider);
  const owner = gym.staff.find((s) => s.role === "OWNER" && s.active);

  // A tenant with no members or disabled automations is getting no value.
  const healthFlags: { tone: "bad" | "warn"; text: string }[] = [];
  if (gym._count.members === 0) healthFlags.push({ tone: "bad", text: "No members imported yet — never onboarded." });
  if (!gym.autoRemindersEnabled) healthFlags.push({ tone: "bad", text: "Automations are switched off, so no reminders are going out." });
  if (enabledRules === 0) healthFlags.push({ tone: "warn", text: "No automation rules are enabled." });
  if (!gym.waConnected) healthFlags.push({ tone: "warn", text: "WhatsApp provider isn't fully configured." });
  if (failedMessages > 0) healthFlags.push({ tone: "warn", text: `${failedMessages} message ${plural(failedMessages, "failure")} in the last 30 days.` });
  if (lastActivity && lastActivity.createdAt < addDays(today, -14)) {
    healthFlags.push({ tone: "warn", text: "No messages sent in over two weeks." });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {created ? (
        <Alert tone="good" title={`${gym.name} is live`}>
          The owner can sign in at <code className="font-mono">/login</code> with{" "}
          <strong>{gym.email}</strong>. Their plans, templates and automations are already
          set up.
        </Alert>
      ) : null}
      {error === "noowner" ? (
        <Alert tone="bad" title="Can't open this account">
          No active owner login exists for this gym.
        </Alert>
      ) : null}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar name={gym.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">
                {gym.name}
              </h1>
              <GymStatusBadge status={gym.status} />
              <Pill>{gym.slug}</Pill>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-500">
              {gym.ownerName} · {gym.email} · {displayPhone(gym.phone)}
            </p>
            <p className="text-[12.5px] text-ink-500">
              {[gym.city, gym.state].filter(Boolean).join(", ") || "—"} · joined{" "}
              {fmtDate(gym.createdAt)} · {gym.timezone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={impersonateGym}>
            <input type="hidden" name="gymId" value={gym.id} />
            <Button type="submit" variant="secondary" size="sm" disabled={!owner}>
              <IconShield className="size-4" />
              Open their dashboard
            </Button>
          </form>
          <Link
            href={`/admin/messages?gym=${gym.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            <IconWhatsApp className="size-4" />
            Messages
          </Link>
        </div>
      </div>

      {healthFlags.length > 0 ? (
        <Card>
          <CardHeader
            title="Account health"
            subtitle="Signals that this tenant is at risk of churning."
          />
          <ul className="mt-3 space-y-2">
            {healthFlags.map((f, i) => (
              <li
                key={i}
                className={
                  f.tone === "bad"
                    ? "flex gap-2 rounded-lg bg-bad-50 p-2.5 text-[12.5px] text-bad-700"
                    : "flex gap-2 rounded-lg bg-warn-50 p-2.5 text-[12.5px] text-warn-700"
                }
              >
                <IconAlert className="mt-0.5 size-3.5 shrink-0" />
                {f.text}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Alert tone="good" title="Healthy account">
          Members are growing, automations are on and messages are being delivered.
        </Alert>
      )}

      {/* ── Usage ────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Usage" subtitle="How much of the product they're actually using." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Members", used: gym._count.members, limit: gym.saasPlan?.memberLimit ?? -1 },
                { label: "Staff logins", used: gym.staff.filter((s) => s.active).length, limit: gym.saasPlan?.staffLimit ?? -1 },
                { label: "Messages this month", used: messagesThisMonth, limit: gym.saasPlan?.waMessageLimit ?? -1 },
                { label: "Automations enabled", used: enabledRules, limit: gym._count.rules },
              ].map((u) => (
                <div key={u.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-ink-600">{u.label}</span>
                    <span className="nums text-[12.5px] font-medium text-ink-900">
                      {num(u.used)}
                      <span className="text-ink-400">
                        {" / "}
                        {u.limit === -1 ? "∞" : num(u.limit)}
                      </span>
                    </span>
                  </div>
                  <Meter
                    value={u.used}
                    max={u.limit === -1 ? Math.max(u.used, 1) : Math.max(u.limit, 1)}
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

            <Divider className="my-4" />

            <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
              {[
                ["Active members", num(activeMembers)],
                ["Expiring in 7d", num(expiringMembers)],
                ["Expired", num(expiredMembers)],
                ["Collected this month", moneyCompact(collectedThisMonth._sum.amount ?? 0)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11.5px] text-ink-500">{k}</dt>
                  <dd className="nums text-lg font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Member growth" subtitle="New joins per month, last 6 months" />
            <div className="mt-4">
              <BarChart data={growth} height={150} tone={1} />
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader title="Staff logins" subtitle={`${gym.staff.length} total`} />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Last sign-in</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {gym.staff.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <span className="block text-[13px] font-medium text-ink-900">{s.name}</span>
                      <span className="block text-[11px] text-ink-500">{s.email}</span>
                    </Td>
                    <Td className="text-[12.5px]">{ROLE_LABELS[s.role] ?? s.role}</Td>
                    <Td className="text-[12.5px] text-ink-600">
                      {s.lastLoginAt ? relativeDayLabel(s.lastLoginAt, tz) : "never"}
                    </Td>
                    <Td>
                      {s.active ? (
                        <Badge className="bg-good-50 text-good-700 ring-good-500/20">active</Badge>
                      ) : (
                        <Badge className="bg-ink-100 text-ink-500 ring-ink-400/20">disabled</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader
                title="Activity log"
                subtitle="What this tenant and our team have been doing."
              />
            </div>
            {auditLog.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No activity recorded" />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {auditLog.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span
                      className={
                        a.actorType === "PLATFORM"
                          ? "mt-1 size-1.5 shrink-0 rounded-full bg-brand-500"
                          : a.actorType === "SYSTEM"
                            ? "mt-1 size-1.5 shrink-0 rounded-full bg-ink-300"
                            : "mt-1 size-1.5 shrink-0 rounded-full bg-good-500"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink-800">
                        {a.action}
                      </p>
                      <p className="truncate text-[11px] text-ink-500">
                        {a.actorName ?? a.actorType.toLowerCase()} ·{" "}
                        {fmtDateTime(a.createdAt, tz)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Right: subscription + controls ─────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Subscription" />
            <dl className="mt-3">
              <Row label="Plan" value={gym.saasPlan?.name ?? "—"} />
              <Row label="Cycle" value={sub?.billingCycle.toLowerCase() ?? "—"} />
              <Row label="MRR" value={<span className="font-semibold">{money(mrr)}</span>} />
              <Row
                label="Period ends"
                value={sub ? fmtDate(sub.currentPeriodEnd) : "—"}
              />
              {gym.trialEndsAt ? (
                <Row
                  label="Trial ends"
                  value={`${fmtDate(gym.trialEndsAt)} (${relativeDayLabel(gym.trialEndsAt, tz)})`}
                />
              ) : null}
            </dl>
          </Card>

          <Card>
            <CardHeader title="WhatsApp" />
            <dl className="mt-3">
              <Row label="Provider" value={provider.label} />
              <Row
                label="Connected"
                value={
                  gym.waConnected ? (
                    <span className="text-good-700">yes</span>
                  ) : (
                    <span className="text-warn-700">incomplete</span>
                  )
                }
              />
              <Row label="Sender name" value={gym.waSenderDisplay ?? "—"} />
              <Row label="Automations" value={gym.autoRemindersEnabled ? "running" : "paused"} />
              <Row label="Rules enabled" value={`${num(enabledRules)} / ${num(gym._count.rules)}`} />
              <Row label="Messages sent" value={num(gym._count.messages)} />
            </dl>
          </Card>

          {isSuper ? (
            <>
              <Card>
                <CardHeader title="Account status" subtitle="Takes effect immediately." />
                <form action={setGymStatus} className="mt-3 flex gap-2">
                  <input type="hidden" name="gymId" value={gym.id} />
                  <Select name="status" defaultValue={gym.status} aria-label="Account status">
                    {GYM_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">
                    Apply
                  </Button>
                </form>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
                  Suspending blocks owner sign-in and stops all automations for this tenant.
                </p>
              </Card>

              <Card>
                <CardHeader title="Change plan" />
                <form action={changeGymPlan} className="mt-3 space-y-2.5">
                  <input type="hidden" name="gymId" value={gym.id} />
                  <Select name="planKey" defaultValue={gym.saasPlan?.key ?? ""} aria-label="Plan">
                    {allPlans.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} — {money(p.priceMonthly)}/mo
                      </option>
                    ))}
                  </Select>
                  <Select
                    name="billingCycle"
                    defaultValue={sub?.billingCycle ?? "MONTHLY"}
                    aria-label="Billing cycle"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </Select>
                  <Button type="submit" variant="secondary" className="w-full">
                    Update subscription
                  </Button>
                </form>
              </Card>

              <Card>
                <CardHeader title="Extend trial" />
                <form action={extendTrial} className="mt-3 flex gap-2">
                  <input type="hidden" name="gymId" value={gym.id} />
                  <Select name="days" defaultValue="14" aria-label="Extra days">
                    {[7, 14, 30, 60].map((d) => (
                      <option key={d} value={d}>
                        +{d} days
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">
                    Extend
                  </Button>
                </form>
              </Card>
            </>
          ) : (
            <Alert tone="info" title="Read-only">
              Support accounts can view everything but not change tenants or billing.
            </Alert>
          )}

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader title="Invoices" />
            </div>
            {gym.invoices.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No invoices" />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {gym.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-2 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11.5px] text-ink-700">{inv.number}</p>
                      <p className="text-[11px] text-ink-500">{fmtDate(inv.issuedAt)}</p>
                    </div>
                    <span className="nums shrink-0 text-[12.5px] font-medium text-ink-900">
                      {money(inv.total)}
                    </span>
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
                    {isSuper && inv.status !== "PAID" && inv.status !== "VOID" ? (
                      <form action={markInvoicePaid}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <button
                          type="submit"
                          className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          mark paid
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
