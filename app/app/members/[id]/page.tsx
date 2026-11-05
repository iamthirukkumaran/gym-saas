import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Meter } from "@/components/charts";
import { PaymentForm } from "@/components/forms/payment-form";
import { SendMessagePanel } from "@/components/forms/send-message";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  LinkButton,
  Pill,
  Row,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import {
  IconAlert,
  IconCalendarCheck,
  IconEdit,
  IconMail,
  IconPhone,
  IconRenew,
  IconSnowflake,
  IconWhatsApp,
} from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODE_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/constants";
import {
  fmtDate,
  fmtDateTime,
  relativeDayLabel,
  toDateInput,
  todayInZone,
  daysBetween,
} from "@/lib/dates";
import { durationLabel, money, num } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";
import { daysRemaining, deriveStatus, STATUS_DOTS, STATUS_STYLES } from "@/lib/status";
import { render } from "@/lib/templates";

import {
  addPayment,
  cancelMember,
  doCheckIn,
  sendManualMessage,
  toggleFreeze,
  toggleOptOut,
} from "../actions";

export const metadata: Metadata = { title: "Member" };

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);

  const member = await db.member.findFirst({
    where: { id, gymId: gym.id },
    include: {
      trainer: { select: { name: true, phone: true } },
      memberships: { orderBy: { endDate: "desc" } },
      payments: { orderBy: { paidAt: "desc" }, take: 12 },
      checkIns: { orderBy: { checkInAt: "desc" }, take: 10 },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!member) notFound();

  const templates = await db.waTemplate.findMany({
    where: { gymId: gym.id, active: true },
    orderBy: { name: "asc" },
    select: { key: true, name: true, category: true, body: true },
  });

  const derived = deriveStatus(member, tz);
  const left = daysRemaining(member.expiryDate, tz);
  const current =
    member.memberships.find(
      (m) => m.status === "ACTIVE" || m.status === "FROZEN" || m.status === "UPCOMING",
    ) ?? member.memberships[0];

  const elapsed = current ? daysBetween(current.startDate, today) : 0;
  const totalBilled = member.memberships
    .filter((m) => m.status !== "CANCELLED")
    .reduce((s, m) => s + m.payable, 0);
  const checkInCount = await db.checkIn.count({ where: { memberId: member.id } });

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const previews: Record<string, string> = {};
  for (const t of templates) {
    previews[t.key] = render(t.body, {
      member,
      gym: { name: gym.name, phone: gym.phone, ownerName: gym.ownerName, timezone: tz, upiId: gym.upiId },
      extra: { renew_link: `${appUrl}/r/${member.id}` },
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* ── Identity header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar name={member.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">
                {member.name}
              </h1>
              <Badge className={STATUS_STYLES[derived]} dot={STATUS_DOTS[derived]}>
                {STATUS_LABELS[derived]}
              </Badge>
              {member.waOptOut ? (
                <Badge className="bg-ink-100 text-ink-600 ring-ink-400/20">
                  WhatsApp off
                </Badge>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
              <Pill>{member.code}</Pill>
              <span className="inline-flex items-center gap-1.5">
                <IconPhone className="size-3.5" />
                {displayPhone(member.phone)}
              </span>
              {member.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconMail className="size-3.5" />
                  {member.email}
                </span>
              ) : null}
              <span>joined {fmtDate(member.joinDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={doCheckIn}>
            <input type="hidden" name="memberId" value={member.id} />
            <Button type="submit" variant="secondary" size="sm">
              <IconCalendarCheck className="size-4" />
              Check in
            </Button>
          </form>
          {!member.waOptOut ? (
            <a
              href={waDeepLink(member.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-medium text-good-700 transition-colors hover:bg-good-50"
            >
              <IconWhatsApp className="size-4" />
              Chat
            </a>
          ) : null}
          <LinkButton href={`/app/members/${member.id}/edit`} variant="secondary" size="sm">
            <IconEdit className="size-4" />
            Edit
          </LinkButton>
          <LinkButton href={`/app/members/${member.id}/renew`} size="sm">
            <IconRenew className="size-4" />
            {member.memberships.length === 0 ? "Assign plan" : "Renew"}
          </LinkButton>
        </div>
      </div>

      {saved === "plan" ? (
        <Alert tone="good" title="Plan saved">
          The membership is active and renewal reminders are scheduled automatically.
        </Alert>
      ) : null}

      {derived === "EXPIRED" ? (
        <Alert tone="bad" title={`Membership expired ${relativeDayLabel(member.expiryDate, tz)}`}>
          Win-back messages are being sent on your automation schedule. Renew here to stop
          them immediately.
        </Alert>
      ) : derived === "EXPIRING" ? (
        <Alert tone="warn" title={`Expires ${relativeDayLabel(member.expiryDate, tz)}`}>
          Reminder messages are already queued for this member.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Left: plan, history ────────────────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Current membership"
              action={
                current ? (
                  <Badge
                    className={
                      current.status === "ACTIVE"
                        ? "bg-good-50 text-good-700 ring-good-500/20"
                        : "bg-ink-100 text-ink-600 ring-ink-400/20"
                    }
                  >
                    {current.status.toLowerCase()}
                  </Badge>
                ) : null
              }
            />

            {!current ? (
              <div className="mt-4">
                <EmptyState
                  title="No plan assigned"
                  body="This member can't be tracked or reminded until they're on a plan."
                  action={
                    <LinkButton href={`/app/members/${member.id}/renew`} size="sm">
                      Assign a plan
                    </LinkButton>
                  }
                />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-ink-900">{current.planName}</p>
                    <p className="text-[13px] text-ink-500">
                      {durationLabel(current.durationDays)} · {fmtDate(current.startDate)} →{" "}
                      {fmtDate(current.endDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        left !== null && left < 0
                          ? "nums text-2xl font-semibold text-bad-600"
                          : left !== null && left <= 7
                            ? "nums text-2xl font-semibold text-warn-600"
                            : "nums text-2xl font-semibold text-good-600"
                      }
                    >
                      {left === null ? "—" : left < 0 ? `${Math.abs(left)}d` : `${left}d`}
                    </p>
                    <p className="text-[11.5px] text-ink-500">
                      {left === null ? "" : left < 0 ? "overdue" : "remaining"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Meter
                    value={Math.max(0, Math.min(elapsed, current.durationDays))}
                    max={current.durationDays}
                    tone={left !== null && left < 0 ? "bad" : left !== null && left <= 7 ? "warn" : "good"}
                  />
                  <p className="nums mt-1.5 text-[11.5px] text-ink-500">
                    day {Math.max(0, Math.min(elapsed + 1, current.durationDays))} of{" "}
                    {current.durationDays}
                    {current.freezeDays > 0 ? ` · ${current.freezeDays} frozen days added` : ""}
                  </p>
                </div>

                <Divider className="my-4" />

                <dl>
                  <Row label="Plan price" value={money(current.price)} />
                  {current.discount > 0 ? (
                    <Row
                      label="Discount"
                      value={<span className="text-good-600">− {money(current.discount)}</span>}
                    />
                  ) : null}
                  <Row
                    label="Payable"
                    value={<span className="font-semibold">{money(current.payable)}</span>}
                  />
                  <Row
                    label="Auto-renew"
                    value={current.autoRenew ? "On" : "Off"}
                  />
                </dl>
              </>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Record a payment"
              subtitle={
                member.balanceDue > 0
                  ? `${money(member.balanceDue)} outstanding.`
                  : "Nothing outstanding — use this for advance payments."
              }
            />
            <div className="mt-4">
              <PaymentForm
                action={addPayment}
                memberId={member.id}
                balanceDue={member.balanceDue}
                memberships={member.memberships
                  .filter((m) => m.status !== "CANCELLED")
                  .map((m) => ({ id: m.id, planName: `${m.planName} (${fmtDate(m.endDate)})`, payable: m.payable }))}
                todayInput={toDateInput(today)}
              />
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader title="Membership history" subtitle={`${member.memberships.length} total`} />
            </div>
            {member.memberships.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No memberships yet" />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Plan</Th>
                    <Th>Period</Th>
                    <Th align="right">Payable</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {member.memberships.map((m) => (
                    <Tr key={m.id}>
                      <Td className="text-[13px] font-medium text-ink-900">
                        {m.planName}
                        {m.isRenewal ? (
                          <span className="ml-1.5 text-[10.5px] font-normal text-ink-400">renewal</span>
                        ) : null}
                      </Td>
                      <Td className="text-[12.5px]">
                        {fmtDate(m.startDate)} → {fmtDate(m.endDate)}
                      </Td>
                      <Td align="right" className="nums text-[13px]">
                        {money(m.payable)}
                      </Td>
                      <Td>
                        <Badge
                          className={
                            m.status === "ACTIVE"
                              ? "bg-good-50 text-good-700 ring-good-500/20"
                              : m.status === "CANCELLED"
                                ? "bg-bad-50 text-bad-700 ring-bad-500/20"
                                : "bg-ink-100 text-ink-600 ring-ink-400/20"
                          }
                        >
                          {m.status.toLowerCase()}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card pad={false}>
            <div className="p-5 pb-2">
              <CardHeader
                title="Payment history"
                subtitle={`${money(member.totalPaid)} received across ${member.payments.length} ${member.payments.length === 1 ? "payment" : "payments"}`}
              />
            </div>
            {member.payments.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No payments recorded" />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th>Mode</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {member.payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <Pill>{p.invoiceNo}</Pill>
                      </Td>
                      <Td className="text-[12.5px]">{fmtDate(p.paidAt)}</Td>
                      <Td className="text-[12.5px]">{MODE_LABELS[p.mode] ?? p.mode}</Td>
                      <Td align="right" className="nums text-[13px] font-medium text-good-700">
                        {money(p.amount)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        {/* ── Right: money, messaging, profile ───────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Account summary" />
            <dl className="mt-3">
              <Row label="Total billed" value={money(totalBilled)} />
              <Row
                label="Total received"
                value={<span className="text-good-700">{money(member.totalPaid)}</span>}
              />
              <Divider className="my-2" />
              <Row
                label="Balance due"
                value={
                  member.balanceDue > 0 ? (
                    <span className="text-base font-semibold text-warn-700">
                      {money(member.balanceDue)}
                    </span>
                  ) : (
                    <span className="text-good-700">Settled</span>
                  )
                }
              />
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Send a WhatsApp message"
              subtitle="Preview shows exactly what they'll receive."
            />
            <div className="mt-4">
              <SendMessagePanel
                action={sendManualMessage}
                memberId={member.id}
                templates={templates.map((t) => ({ key: t.key, name: t.name, category: t.category }))}
                previews={previews}
                optedOut={member.waOptOut}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Attendance"
              subtitle={`${num(checkInCount)} total visits · last ${member.lastCheckInAt ? relativeDayLabel(member.lastCheckInAt, tz) : "never"}`}
            />
            {member.checkIns.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No check-ins recorded" />
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {member.checkIns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-700">{fmtDateTime(c.checkInAt, tz)}</span>
                    <span className="text-ink-400">{c.method.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Message history" />
            {member.messages.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nothing sent yet" />
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {member.messages.map((m) => (
                  <li key={m.id} className="rounded-lg border border-ink-100 bg-ink-50/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium text-ink-800">
                        {m.templateKey ?? "manual"}
                      </span>
                      <Badge
                        className={
                          m.status === "FAILED"
                            ? "bg-bad-50 text-bad-700 ring-bad-500/20"
                            : m.status === "SKIPPED"
                              ? "bg-ink-100 text-ink-600 ring-ink-400/20"
                              : m.status === "QUEUED"
                                ? "bg-info-50 text-info-700 ring-info-500/20"
                                : "bg-good-50 text-good-700 ring-good-500/20"
                        }
                      >
                        {m.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
                      {m.body}
                    </p>
                    <p className="mt-1 text-[10.5px] text-ink-400">
                      {fmtDateTime(m.sentAt ?? m.createdAt, tz)}
                      {m.error ? ` · ${m.error}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Profile" />
            <dl className="mt-3">
              <Row label="Gender" value={member.gender ? member.gender.toLowerCase() : "—"} />
              <Row label="Date of birth" value={fmtDate(member.dob)} />
              <Row label="Height" value={member.heightCm ? `${member.heightCm} cm` : "—"} />
              <Row label="Weight" value={member.weightKg ? `${member.weightKg} kg` : "—"} />
              <Row label="Goal" value={member.goal ?? "—"} />
              <Row label="Trainer" value={member.trainer?.name ?? "—"} />
              <Row label="Source" value={member.source ? SOURCE_LABELS[member.source] : "—"} />
              <Row label="City" value={member.city ?? "—"} />
              <Row
                label="Emergency"
                value={
                  member.emergencyName
                    ? `${member.emergencyName} · ${displayPhone(member.emergencyPhone ?? "")}`
                    : "—"
                }
              />
            </dl>
            {member.medicalNotes ? (
              <div className="mt-3 rounded-lg bg-warn-50 p-3 text-[12.5px] text-warn-700">
                <p className="flex items-center gap-1.5 font-semibold">
                  <IconAlert className="size-3.5" />
                  Medical notes
                </p>
                <p className="mt-1">{member.medicalNotes}</p>
              </div>
            ) : null}
            {member.notes ? (
              <div className="mt-3 rounded-lg bg-ink-50 p-3 text-[12.5px] text-ink-600">
                <p className="font-semibold text-ink-700">Internal notes</p>
                <p className="mt-1">{member.notes}</p>
              </div>
            ) : null}
          </Card>

          {/* Destructive actions, deliberately last and visually quiet */}
          <Card>
            <CardHeader title="Member actions" />
            <div className="mt-3 space-y-2.5">
              <form action={toggleFreeze} className="flex items-center justify-between gap-3">
                <input type="hidden" name="memberId" value={member.id} />
                <span className="text-[12.5px] text-ink-600">
                  {member.status === "FROZEN"
                    ? "Resume this membership and add back the paused days."
                    : "Pause the membership — remaining days are preserved."}
                </span>
                <Button type="submit" variant="secondary" size="sm">
                  <IconSnowflake className="size-3.5" />
                  {member.status === "FROZEN" ? "Unfreeze" : "Freeze"}
                </Button>
              </form>

              <Divider />

              <form action={toggleOptOut} className="flex items-center justify-between gap-3">
                <input type="hidden" name="memberId" value={member.id} />
                <span className="text-[12.5px] text-ink-600">
                  {member.waOptOut
                    ? "Re-enable WhatsApp messages for this member."
                    : "Stop all WhatsApp messages to this member."}
                </span>
                <Button type="submit" variant="secondary" size="sm">
                  {member.waOptOut ? "Enable WhatsApp" : "Opt out"}
                </Button>
              </form>

              <Divider />

              <form action={cancelMember} className="flex items-center justify-between gap-3">
                <input type="hidden" name="memberId" value={member.id} />
                <span className="text-[12.5px] text-ink-600">
                  Cancel this membership. Payment history is kept for your records.
                </span>
                <Button type="submit" variant="danger" size="sm">
                  Cancel member
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
