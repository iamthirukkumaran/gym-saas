import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { GYM_NAV } from "@/components/nav-config";
import { Badge } from "@/components/ui";
import { IconAlert, IconExternal, IconShield } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRING_WINDOW_DAYS, ROLE_LABELS } from "@/lib/constants";
import { addDays, relativeDayLabel, todayInZone } from "@/lib/dates";

import { logoutStaff } from "../login/actions";

/**
 * Every gym page renders inside here, so `requireStaff()` is the single gate
 * for the whole tenant surface — there is no route that can forget to check.
 */
export default async function GymAppLayout({ children }: { children: React.ReactNode }) {
  const { session, staff, gym } = await requireStaff();

  const today = todayInZone(gym.timezone);
  const horizon = addDays(today, EXPIRING_WINDOW_DAYS);
  const weekAgo = addDays(today, -7);

  const [expiring, dues, followups, failed] = await Promise.all([
    db.member.count({
      where: { gymId: gym.id, status: "ACTIVE", expiryDate: { gte: today, lte: horizon } },
    }),
    db.member.count({
      where: { gymId: gym.id, balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
    }),
    db.lead.count({
      where: {
        gymId: gym.id,
        status: { in: ["NEW", "CONTACTED"] },
        followUpAt: { lte: today },
      },
    }),
    db.messageLog.count({
      where: { gymId: gym.id, status: "FAILED", createdAt: { gte: weekAgo } },
    }),
  ]);

  const trialDaysLeft =
    gym.status === "TRIAL" && gym.trialEndsAt
      ? Math.ceil((gym.trialEndsAt.getTime() - today.getTime()) / 86_400_000)
      : null;

  const statusBadge =
    gym.status === "TRIAL" ? (
      <Badge className="bg-info-50 text-info-700 ring-info-500/20">Trial</Badge>
    ) : gym.status === "PAST_DUE" ? (
      <Badge className="bg-warn-50 text-warn-700 ring-warn-500/25">Payment due</Badge>
    ) : gym.status === "SUSPENDED" ? (
      <Badge className="bg-bad-50 text-bad-700 ring-bad-500/20">Suspended</Badge>
    ) : null;

  const banner = (
    <>
      {session.impersonatedBy ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-700 bg-brand-900 px-4 py-2.5 text-[13px] text-white sm:px-6">
          <span className="flex items-center gap-2">
            <IconShield className="size-4 shrink-0" />
            You are viewing <strong className="font-semibold">{gym.name}</strong> as Astryx
            support ({session.impersonatorName}). Actions are logged against your admin
            account.
          </span>
          <Link
            href="/admin/gyms"
            className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 font-medium transition-colors hover:bg-white/25"
          >
            Exit to admin
          </Link>
        </div>
      ) : null}

      {trialDaysLeft !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-info-500/20 bg-info-50 px-4 py-2.5 text-[13px] text-info-700 sm:px-6">
          <span>
            {trialDaysLeft > 0 ? (
              <>
                Your free trial ends{" "}
                <strong className="font-semibold">
                  {relativeDayLabel(gym.trialEndsAt, gym.timezone)}
                </strong>
                . Everything keeps working — add a payment method before then to avoid a
                pause.
              </>
            ) : (
              <>Your free trial has ended. Add a payment method to keep automations running.</>
            )}
          </span>
          <Link
            href="/app/settings/billing"
            className="shrink-0 rounded-md bg-info-500 px-2.5 py-1 font-medium text-white transition-colors hover:bg-info-600"
          >
            View plans
          </Link>
        </div>
      ) : null}

      {gym.status === "PAST_DUE" ? (
        <div className="flex items-center gap-2 border-b border-warn-500/25 bg-warn-50 px-4 py-2.5 text-[13px] text-warn-700 sm:px-6">
          <IconAlert className="size-4 shrink-0" />
          A subscription payment failed. Automations continue for now — please settle the
          invoice to avoid interruption.
        </div>
      ) : null}

      {!gym.waConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warn-500/25 bg-warn-50 px-4 py-2.5 text-[13px] text-warn-700 sm:px-6">
          <span className="flex items-center gap-2">
            <IconAlert className="size-4 shrink-0" />
            WhatsApp isn&apos;t connected, so reminders are being logged but not delivered.
          </span>
          <Link
            href="/app/settings/whatsapp"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warn-500 px-2.5 py-1 font-medium text-white transition-colors hover:bg-warn-600"
          >
            Connect WhatsApp
            <IconExternal className="size-3" />
          </Link>
        </div>
      ) : null}
    </>
  );

  return (
    <AppShell
      sections={GYM_NAV}
      counts={{ expiring, dues, followups, failed }}
      role={staff.role}
      brandHref="/app"
      title={gym.name}
      subtitle={`${gym.city ?? "—"} · ${gym.saasPlan?.name ?? "No plan"} · ${ROLE_LABELS[staff.role] ?? staff.role}`}
      badge={statusBadge}
      userName={staff.name}
      userMeta={staff.email}
      logoutAction={logoutStaff}
      banner={banner}
    >
      {children}
    </AppShell>
  );
}
