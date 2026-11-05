import type { ReactNode } from "react";
import Link from "next/link";

import { avatarTint, initials } from "@/lib/format";

/**
 * Presentational primitives.
 *
 * Deliberately hook-free so server components can render them directly —
 * which keeps almost the entire app server-rendered and the client bundle
 * small. Anything needing state lives in its own "use client" file.
 */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ── Surfaces ────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-200 bg-white shadow-card",
        pad && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "good";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all " +
  "disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px whitespace-nowrap";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 hover:border-ink-300",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-bad-600 text-white hover:bg-bad-700 shadow-sm shadow-bad-600/20",
  good: "bg-good-600 text-white hover:bg-good-700 shadow-sm shadow-good-600/20",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cn(buttonClass(variant, size), className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  prefetch,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(buttonClass(variant, size), className)}
    >
      {children}
    </Link>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className ?? "bg-ink-100 text-ink-700 ring-ink-400/20",
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        avatarTint(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brand";
  icon?: ReactNode;
  href?: string;
}) {
  const tones = {
    neutral: "text-ink-900",
    good: "text-good-700",
    warn: "text-warn-700",
    bad: "text-bad-700",
    brand: "text-brand-700",
  };
  const ringTones = {
    neutral: "bg-ink-100 text-ink-500",
    good: "bg-good-50 text-good-600",
    warn: "bg-warn-50 text-warn-600",
    bad: "bg-bad-50 text-bad-600",
    brand: "bg-brand-50 text-brand-600",
  };

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        {icon ? (
          <span className={cn("grid size-7 place-items-center rounded-lg", ringTones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("nums mt-2 text-2xl font-semibold tracking-tight", tones[tone])}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-500">{sub}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-ink-200 bg-white p-4 shadow-card transition-all hover:border-ink-300 hover:shadow-lift"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-card">{inner}</div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("thin-scroll overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-ink-200 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-ink-100 px-3 py-2.5 align-middle text-ink-700",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn("transition-colors hover:bg-ink-50/70", className)}>{children}</tr>;
}

// ── Empty / error states ────────────────────────────────────────────────────

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-ink-400">{icon}</div> : null}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[13px] text-ink-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const tones = {
    info: "bg-info-50 border-info-500/25 text-info-700",
    good: "bg-good-50 border-good-500/25 text-good-700",
    warn: "bg-warn-50 border-warn-500/30 text-warn-700",
    bad: "bg-bad-50 border-bad-500/25 text-bad-700",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
    </div>
  );
}

// ── Form fields ─────────────────────────────────────────────────────────────

export const inputClass =
  "block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 " +
  "placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:outline-none " +
  "focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-500";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
        {required ? <span className="ml-0.5 text-bad-600">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-bad-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

// `ref` is declared explicitly: React 19 passes it as an ordinary prop, but
// the typings for a plain function component don't include it by default.
export function Input({
  className,
  ref,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", className)} {...rest} />;
}

export function Checkbox({
  label,
  hint,
  className,
  ...rest
}: { label: ReactNode; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
        {...rest}
      />
      <span>
        <span className="block text-[13px] font-medium text-ink-800">{label}</span>
        {hint ? <span className="block text-xs text-ink-500">{hint}</span> : null}
      </span>
    </label>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-ink-200", className)} />;
}

export function Row({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5", className)}>
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-[13px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export function Tabs({
  tabs,
  current,
}: {
  tabs: { href: string; label: string; count?: number }[];
  current: string;
}) {
  return (
    <div className="thin-scroll mb-5 flex gap-1 overflow-x-auto border-b border-ink-200">
      {tabs.map((t) => {
        const active = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span className="nums ml-1.5 text-ink-400">{t.count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
