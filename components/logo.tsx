"use client";

import { useId } from "react";

import { cn } from "./ui";

/**
 * The Astryx mark: an "A" built from a rising bar chart — growth, which is
 * what the product actually sells, rather than a dumbbell like every
 * competitor.
 *
 * `markOnly` drops the wordmark, for the collapsed sidebar rail.
 *
 * The gradient id comes from `useId()` because the logo renders more than
 * once per page (sidebar rail + mobile drawer, marketing header + footer).
 * A hardcoded id means every instance references the *first* matching
 * element in the document — and when that first one sits inside a
 * `display:none` subtree, as the desktop sidebar does on mobile, the mark
 * silently fails to paint. `useId` is stable across server and client, so
 * this stays hydration-safe.
 */
export function Logo({
  className,
  variant = "dark",
  markOnly = false,
}: {
  className?: string;
  variant?: "dark" | "light";
  markOnly?: boolean;
}) {
  const gradientId = `astryx-mark-${useId()}`;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
        <path
          d="M9 22.5 16 9l7 13.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M12.4 18.2h7.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#8f75ff" />
            <stop offset="1" stopColor="#5a32f0" />
          </linearGradient>
        </defs>
      </svg>
      {markOnly ? (
        <span className="sr-only">Astryx</span>
      ) : (
        <span
          className={cn(
            "whitespace-nowrap text-[17px] font-semibold tracking-tight",
            variant === "dark" ? "text-ink-900" : "text-white",
          )}
        >
          Astryx
        </span>
      )}
    </span>
  );
}
