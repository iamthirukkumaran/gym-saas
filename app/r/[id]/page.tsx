import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Logo } from "@/components/logo";
import { IconAlert, IconCheck, IconPhone, IconWhatsApp } from "@/components/icons";
import { db } from "@/lib/db";
import { fmtDate, relativeDayLabel, todayInZone } from "@/lib/dates";
import { durationLabel, money } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";
import { daysRemaining } from "@/lib/status";

export const metadata: Metadata = {
  title: "Renew your membership",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The public renewal page — the destination of {{renew_link}}.
 *
 * This is the only unauthenticated page that shows member data, so it is
 * deliberately minimal: name, plan, expiry and amount. No contact details,
 * no medical notes, no attendance, nothing about any other member. The URL
 * carries an unguessable cuid and is noindex'd, the same trust model as any
 * emailed magic link.
 *
 * It does not claim to take a payment. It shows the amount, offers a UPI
 * intent link that opens the member's own payment app, and tells them the
 * gym confirms manually — because pretending to be a payment gateway would
 * be worse than being honest about a two-step flow.
 */
export default async function PublicRenewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      expiryDate: true,
      activePlanName: true,
      balanceDue: true,
      gym: {
        select: {
          name: true,
          phone: true,
          city: true,
          addressLine: true,
          timezone: true,
          upiId: true,
          status: true,
        },
      },
      memberships: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { endDate: "desc" },
        take: 1,
        select: { planName: true, durationDays: true, payable: true, endDate: true },
      },
    },
  });

  if (!member) notFound();

  const gym = member.gym;
  const tz = gym.timezone;
  const today = todayInZone(tz);
  const left = daysRemaining(member.expiryDate, tz);
  const current = member.memberships[0] ?? null;

  // What they'd pay to continue: any outstanding balance, else the price of
  // the plan they're already on.
  const renewAmount = member.balanceDue > 0 ? member.balanceDue : (current?.payable ?? 0);

  const upiLink =
    gym.upiId && renewAmount > 0
      ? `upi://pay?pa=${encodeURIComponent(gym.upiId)}&pn=${encodeURIComponent(gym.name)}&am=${(renewAmount / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${member.code} renewal`)}`
      : null;

  const waMessage = `Hi ${gym.name}, I'd like to renew my membership. Member ID: ${member.code} (${member.name}).`;
  const expired = left !== null && left < 0;

  return (
    <div className="min-h-dvh bg-ink-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 text-center">
          <p className="text-lg font-semibold tracking-tight text-ink-900">{gym.name}</p>
          <p className="text-[13px] text-ink-500">
            {gym.city ? `${gym.city} · ` : ""}
            {displayPhone(gym.phone)}
          </p>
        </div>

        {/* Status card */}
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          <div
            className={
              expired
                ? "bg-bad-600 px-5 py-4 text-white"
                : left !== null && left <= 7
                  ? "bg-warn-500 px-5 py-4 text-white"
                  : "bg-good-600 px-5 py-4 text-white"
            }
          >
            <p className="text-[12px] font-medium uppercase tracking-wide opacity-80">
              {expired ? "Membership expired" : "Membership active"}
            </p>
            <p className="mt-0.5 text-xl font-semibold">{member.name}</p>
            <p className="mt-0.5 text-[13px] opacity-90">Member ID {member.code}</p>
          </div>

          <div className="space-y-3 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-ink-500">Plan</span>
              <span className="text-[13.5px] font-medium text-ink-900">
                {member.activePlanName ?? current?.planName ?? "—"}
                {current ? (
                  <span className="ml-1 text-[11.5px] font-normal text-ink-500">
                    ({durationLabel(current.durationDays)})
                  </span>
                ) : null}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-ink-500">
                {expired ? "Expired on" : "Valid until"}
              </span>
              <span className="text-[13.5px] font-medium text-ink-900">
                {fmtDate(member.expiryDate)}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-ink-500">
                {expired ? "Expired" : "Time remaining"}
              </span>
              <span
                className={
                  expired
                    ? "text-[13.5px] font-semibold text-bad-600"
                    : left !== null && left <= 7
                      ? "text-[13.5px] font-semibold text-warn-700"
                      : "text-[13.5px] font-semibold text-good-700"
                }
              >
                {relativeDayLabel(member.expiryDate, tz)}
              </span>
            </div>

            {member.balanceDue > 0 ? (
              <div className="flex items-baseline justify-between gap-4 border-t border-ink-100 pt-3">
                <span className="text-[13px] text-ink-500">Outstanding balance</span>
                <span className="nums text-base font-semibold text-warn-700">
                  {money(member.balanceDue)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Renew */}
        <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink-900">
            {expired ? "Reactivate your membership" : "Renew your membership"}
          </h2>

          {renewAmount > 0 ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Amount to pay:{" "}
              <strong className="font-semibold text-ink-900">{money(renewAmount)}</strong>
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Message the gym and they&apos;ll confirm your plan and the amount.
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {upiLink ? (
              <a
                href={upiLink}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Pay {money(renewAmount)} by UPI
              </a>
            ) : null}

            <a
              href={waDeepLink(gym.phone, waMessage)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-good-600 font-semibold text-white transition-colors hover:bg-good-700"
            >
              <IconWhatsApp className="size-4" />
              Message the gym on WhatsApp
            </a>

            <a
              href={`tel:${gym.phone}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 font-semibold text-ink-800 transition-colors hover:bg-ink-50"
            >
              <IconPhone className="size-4" />
              Call {displayPhone(gym.phone)}
            </a>
          </div>

          {upiLink ? (
            <div className="mt-4 flex gap-2 rounded-lg bg-info-50 p-3 text-[12px] leading-relaxed text-info-700">
              <IconAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                After paying by UPI, please send the screenshot on WhatsApp so{" "}
                {gym.name} can confirm your renewal. Your membership is extended once they
                record it.
              </span>
            </div>
          ) : null}

          {gym.upiId ? (
            <p className="mt-3 text-center text-[11.5px] text-ink-500">
              UPI ID: <span className="font-mono text-ink-700">{gym.upiId}</span>
            </p>
          ) : null}
        </div>

        {gym.addressLine ? (
          <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
              Visit us
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
              {gym.addressLine}
              {gym.city ? `, ${gym.city}` : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
            <IconCheck className="size-3 text-good-500" strokeWidth={3} />
            Secure page · only your own membership is shown
          </span>
          <a
            href="/"
            className="flex items-center gap-1 text-[11px] text-ink-400 transition-colors hover:text-ink-600"
          >
            powered by <Logo className="scale-75" />
          </a>
        </div>
      </div>
    </div>
  );
}
