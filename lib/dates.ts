import { addDays as fnsAddDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "Asia/Kolkata";

/**
 * Date-only semantics.
 *
 * Join dates, start dates and expiry dates are calendar days, not instants.
 * Everything is normalised to UTC midnight of that calendar day so that
 * comparisons are exact and never shift when the server's offset changes.
 */
export function utcDay(input: Date | string | number): Date {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** UTC midnight of *the gym's* current calendar day. */
export function todayInZone(tz: string = DEFAULT_TZ): Date {
  const parts = formatInTimeZone(new Date(), tz, "yyyy-MM-dd").split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

/** Current hour (0–23) in the gym's timezone — drives send-window checks. */
export function hourInZone(tz: string = DEFAULT_TZ): number {
  return Number(formatInTimeZone(new Date(), tz, "H"));
}

/** Parse a `yyyy-MM-dd` form value into a date-only UTC instant. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : utcDay(fallback);
  }
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format for `<input type="date">`. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return formatInTimeZone(d, "UTC", "yyyy-MM-dd");
}

export function addDays(d: Date, n: number): Date {
  return utcDay(fnsAddDays(utcDay(d), n));
}

/** Whole calendar days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(utcDay(to), utcDay(from));
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatInTimeZone(d, "UTC", "dd MMM yyyy");
}

export function fmtDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatInTimeZone(d, "UTC", "dd MMM");
}

/** Timestamps (not calendar days) render in the gym's timezone. */
export function fmtDateTime(d: Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!d) return "—";
  return formatInTimeZone(d, tz, "dd MMM yyyy, h:mm a");
}

export function fmtTime(d: Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!d) return "—";
  return formatInTimeZone(d, tz, "h:mm a");
}

/** "in 7 days" / "today" / "3 days ago" — relative to the gym's today. */
export function relativeDayLabel(target: Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!target) return "—";
  const n = daysBetween(todayInZone(tz), target);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return `in ${n} days`;
  return `${Math.abs(n)} days ago`;
}

export function hourLabel(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
}

/** Inclusive list of the last `n` months as {key:'yyyy-MM', label:'Nov 26'}. */
export function lastMonths(n: number, tz = DEFAULT_TZ) {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = toZonedTime(new Date(), tz);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    out.push({
      key: formatInTimeZone(start, "UTC", "yyyy-MM"),
      label: formatInTimeZone(start, "UTC", "MMM yy"),
      start,
      end,
    });
  }
  return out;
}

export function monthBounds(d: Date = new Date(), tz = DEFAULT_TZ) {
  const [y, m] = formatInTimeZone(d, tz, "yyyy-MM").split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}
