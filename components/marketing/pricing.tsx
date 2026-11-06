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
          className="relative inline-flex items-center rounded-xl border border-white/12 bg-white/[0.03] p-1"
        >
          {/* Sliding pill */}
          <span
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-butter-300 transition-transform duration-300 ease-out"
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
                  "relative z-10 w-32 rounded-lg px-4 py-2.5 text-[14px] font-medium transition-colors",
                  active ? "text-void" : "text-white/50 hover:text-white/85",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {monthsFree > 0 ? (
        <p className="mt-4 text-center text-[13.5px] text-butter-300">
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
                "lift relative rounded-2xl p-8",
                featured
                  ? "bg-butter-300 text-void shadow-[0_24px_60px_-12px_rgb(212_255_63_/_0.25)]"
                  : "border border-white/12 bg-white/[0.02] hover:border-white/25",
              )}
            >
              {featured ? (
                <span className="absolute -top-3.5 left-8 rounded-lg bg-void px-3 py-2 text-[12.5px] font-medium text-butter-300">
                  Most popular
                </span>
              ) : null}

              <h3 className={cn("display display-sm", featured ? "text-void" : "text-white")}>{p.name}</h3>
              <p
                className={cn(
                  "mt-2 min-h-10 text-[13.5px] leading-snug",
                  featured ? "text-void/65" : "text-white/45",
                )}
              >
                {p.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                {/* key forces a re-mount so the number animates on toggle */}
                <span
                  key={`${p.key}-${yearly}`}
                  className={cn(
                    "display bubble-in text-[2.75rem]",
                    featured ? "text-void" : "text-white",
                  )}
                >
                  {inr(price)}
                </span>
                <span className={cn("label", featured ? "text-void/55" : "text-white/40")}>
                  /{yearly ? "yr" : "mo"}
                </span>
              </div>

              <p className={cn("nums mt-2 h-5 text-[12px]", featured ? "text-void/55" : "text-white/35")}>
                {yearly
                  ? `${inr(Math.round(p.priceYearly / 12))} per month, billed yearly`
                  : `${inr(p.priceYearly)} if you pay yearly`}
              </p>

              <Link
                href="/login"
                className={cn(
                  "mt-7 flex h-13 items-center justify-center rounded-lg py-4 text-[15px] font-medium transition-all",
                  featured
                    ? "bg-void text-butter-300 hover:bg-void-soft"
                    : "border border-white/20 text-white hover:border-butter-300 hover:bg-butter-300 hover:text-void",
                )}
              >
                Start 14-day trial
              </Link>

              <ul
                className={cn(
                  "mt-8 space-y-3.5 border-t pt-7",
                  featured ? "border-void/15" : "border-white/10",
                )}
              >
                {p.features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex items-start gap-3 text-[13.5px]",
                      featured ? "text-void/80" : "text-white/65",
                    )}
                  >
                    <IconCheck
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        featured ? "text-void" : "text-butter-300",
                      )}
                      strokeWidth={3}
                    />
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
