/**
 * Money is stored as integer paise everywhere. These helpers are the only
 * place rupees exist, so rounding can never drift through the app.
 */

export function toPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/,/g, "")) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function toRupees(paise: number): number {
  return paise / 100;
}

/** ₹12,500 — no decimals when the amount is whole, which it usually is. */
export function money(paise: number | null | undefined, opts?: { decimals?: boolean }): string {
  const value = (paise ?? 0) / 100;
  const decimals = opts?.decimals ?? !Number.isInteger(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(value);
}

/** ₹1.2L / ₹14.5K — for dashboard tiles where width is scarce. */
export function moneyCompact(paise: number | null | undefined): string {
  const v = (paise ?? 0) / 100;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function num(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(n ?? 0);
}

export function pct(value: number, total: number, decimals = 0): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(decimals)}%`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar tint so the same member keeps the same colour. */
export function avatarTint(seed: string): string {
  const tints = [
    "bg-brand-100 text-brand-700",
    "bg-good-100 text-good-700",
    "bg-warn-100 text-warn-700",
    "bg-info-100 text-info-700",
    "bg-bad-100 text-bad-700",
    "bg-ink-200 text-ink-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return tints[h % tints.length];
}

export function plural(n: number, one: string, many?: string): string {
  return n === 1 ? one : (many ?? `${one}s`);
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/** Days → "1 month" / "3 months" / "45 days" for plan durations. */
export function durationLabel(days: number): string {
  if (days % 365 === 0 && days >= 365) {
    const y = days / 365;
    return `${y} ${plural(y, "year")}`;
  }
  if (days % 30 === 0 && days >= 30) {
    const m = days / 30;
    return `${m} ${plural(m, "month")}`;
  }
  if (days % 7 === 0 && days >= 7) {
    const w = days / 7;
    return `${w} ${plural(w, "week")}`;
  }
  return `${days} ${plural(days, "day")}`;
}
