"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "../ui";
import { IconCheck } from "../icons";

export type PlanCard = {
  key: string;
  name: string;
  tagline: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
};

/**
 * Pricing with a monthly/yearly toggle.
 *
 * The yearly saving is computed from the real plan rows rather than
 * hardcoded, so it can never drift from what the product actually charges.
 */
export function PricingTable({ plans }: { plans: PlanCard[] }) {
  const [yearly, setYearly] = useState(false);

  const inr = (paise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);

  // Biggest honest saving across the catalogue, in months-free terms.
  const monthsFree = Math.max(
    0,
    ...plans.map((p) =>
      p.priceMonthly > 0 ? Math.round(12 - p.priceYearly / p.priceMonthly) : 0,
    ),
  );

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="relative inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] p-1 backdrop-blur"
        >
          {/* Sliding pill */}
          <span
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-300 ease-out"
            style={{ transform: yearly ? "translateX(100%)" : "translateX(0)" }}
            aria-hidden
          />
          {(["Monthly", "Yearly"] as const).map((label, i) => {
            const active = (i === 1) === yearly;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setYearly(i === 1)}
                aria-pressed={active}
                className={cn(
                  "relative z-10 w-32 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors",
                  active ? "text-ink-900" : "text-white/60 hover:text-white/85",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {monthsFree > 0 ? (
        <p className="mt-3 text-center text-[13px] text-good-400">
          Yearly billing is {monthsFree} {monthsFree === 1 ? "month" : "months"} free
        </p>
      ) : null}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => {
          const featured = i === 1;
          const price = yearly ? p.priceYearly : p.priceMonthly;

          return (
            <div
              key={p.key}
              className={cn(
                "lift relative rounded-3xl p-7",
                featured
                  ? "glow-border bg-ink-900 shadow-2xl shadow-brand-900/40"
                  : "border border-white/10 bg-white/[0.03] hover:border-white/20",
              )}
            >
              {featured ? (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-brand-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg">
                  Most popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1 min-h-10 text-[13px] leading-snug text-white/50">
                {p.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                {/* key forces a re-mount so the number animates on toggle */}
                <span
                  key={`${p.key}-${yearly}`}
                  className="nums bubble-in text-4xl font-semibold tracking-tight text-white"
                >
                  {inr(price)}
                </span>
                <span className="text-sm text-white/45">/{yearly ? "year" : "month"}</span>
              </div>

              <p className="nums mt-1 h-5 text-[12px] text-white/40">
                {yearly
                  ? `${inr(Math.round(p.priceYearly / 12))} per month, billed yearly`
                  : `${inr(p.priceYearly)} if you pay yearly`}
              </p>

              <Link
                href="/login"
                className={cn(
                  "mt-6 flex h-12 items-center justify-center rounded-xl font-semibold transition-all",
                  featured
                    ? "shine bg-white text-ink-900 hover:scale-[1.02]"
                    : "border border-white/15 text-white hover:bg-white/10",
                )}
              >
                Start 14-day trial
              </Link>

              <ul className="mt-7 space-y-3 border-t border-white/10 pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-white/70">
                    <IconCheck className="mt-0.5 size-3.5 shrink-0 text-good-400" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
