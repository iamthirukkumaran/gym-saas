import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui";
import { IconLock, IconShield } from "@/components/icons";
import { getPlatformSession } from "@/lib/auth";
import { db } from "@/lib/db";

import { loginPlatform } from "./actions";

export const metadata: Metadata = { title: "Platform admin" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getPlatformSession()) redirect("/admin");
  const { error } = await searchParams;

  let hasSeed = false;
  try {
    hasSeed = (await db.platformUser.count()) > 0;
  } catch {
    hasSeed = false;
  }

  return (
    <div className="surface-dark grid-lines flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-between">
          <Logo variant="light" />
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/75">
            <IconShield className="size-3.5" />
            Internal
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/40">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <IconLock className="size-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">
            Astryx platform admin
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Provision gyms, manage subscriptions and monitor message delivery across every
            tenant.
          </p>

          {error === "session" ? (
            <div className="mt-5">
              <Alert tone="warn">Your session expired. Please sign in again.</Alert>
            </div>
          ) : error === "forbidden" ? (
            <div className="mt-5">
              <Alert tone="warn">That area needs a superadmin account.</Alert>
            </div>
          ) : null}

          <div className="mt-6">
            <AuthForm action={loginPlatform} submitLabel="Sign in to admin" />
          </div>

          {hasSeed ? (
            <div className="mt-6 rounded-lg bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-600">
              <p className="font-semibold text-ink-700">Demo credentials</p>
              <p className="mt-1 font-mono">admin@astryx.app / astryx123 — superadmin</p>
              <p className="font-mono">support@astryx.app / astryx123 — read-only</p>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-[13px] text-white/45">
          Gym owner?{" "}
          <Link href="/login" className="text-white/80 underline hover:text-white">
            Sign in here instead
          </Link>
        </p>
      </div>
    </div>
  );
}
