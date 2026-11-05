import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui";
import { IconCheck, IconChevronLeft, IconWhatsApp } from "@/components/icons";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";

import { loginStaff } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  session: "Your session expired. Please sign in again.",
  suspended: "This gym account is suspended. Contact Astryx support.",
};

/** Demo credentials, surfaced only when the seeded demo gyms are present. */
async function demoAccounts() {
  try {
    const gyms = await db.gym.findMany({
      where: { email: { in: ["owner@ironcore.in", "owner@pulsearena.in", "owner@titanstrength.in"] } },
      select: { name: true, email: true, _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    });
    return gyms;
  } catch {
    return [];
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  if (await getStaffSession()) redirect("/app");

  const { error, email } = await searchParams;
  const demos = await demoAccounts();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* ── Form side ─────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-ink-500 transition-colors hover:text-ink-800"
          >
            <IconChevronLeft className="size-3.5" />
            Back to astryx.app
          </Link>

          <Logo />

          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-900">
            Sign in to your gym
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Manage members, track renewals and keep your WhatsApp automations running.
          </p>

          {error && ERRORS[error] ? (
            <div className="mt-5">
              <Alert tone="warn">{ERRORS[error]}</Alert>
            </div>
          ) : null}

          <div className="mt-7">
            <AuthForm action={loginStaff} autoFillEmail={email} />
          </div>

          {demos.length > 0 ? (
            <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                Demo accounts
              </p>
              <p className="mt-1 text-[12px] text-ink-500">
                Password for all of them: <code className="font-mono text-ink-800">gym1234</code>
              </p>
              <ul className="mt-3 space-y-2">
                {demos.map((g) => (
                  <li key={g.email} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">{g.name}</p>
                      <p className="truncate font-mono text-[11px] text-ink-500">{g.email}</p>
                    </div>
                    <span className="nums shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] text-ink-500 ring-1 ring-ink-200">
                      {g._count.members} members
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-8">
              <Alert tone="info" title="No gyms yet">
                Run <code className="font-mono">npm run db:reset</code> to create the demo data.
              </Alert>
            </div>
          )}

          <p className="mt-8 text-center text-[13px] text-ink-500">
            Are you Astryx staff?{" "}
            <Link href="/admin/login" className="font-medium text-brand-600 hover:text-brand-700">
              Platform admin sign-in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Brand side ────────────────────────────────────────────────── */}
      <div className="surface-dark grid-lines relative hidden items-center lg:flex">
        <div className="relative mx-auto max-w-lg px-14 py-16">
          <IconWhatsApp className="size-10 text-good-500" />
          <blockquote className="mt-7 text-2xl font-medium leading-snug text-white">
            &ldquo;We used to find out a member had left when they stopped coming.
            Now we hear from them before the plan even ends.&rdquo;
          </blockquote>
          <p className="mt-5 text-sm text-white/55">
            — the problem Astryx was built to kill
          </p>

          <ul className="mt-12 space-y-3.5 border-t border-white/10 pt-9">
            {[
              "Every member, plan and expiry date in one place",
              "Renewal reminders that send themselves on WhatsApp",
              "Dues, attendance and win-backs tracked automatically",
              "Quiet hours and opt-outs respected, always",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-[14px] text-white/75">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-good-500/15">
                  <IconCheck className="size-3 text-good-500" strokeWidth={2.5} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
