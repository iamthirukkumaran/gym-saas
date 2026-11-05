import { EXPIRING_WINDOW_DAYS, type DerivedStatus } from "./constants";
import { daysBetween, todayInZone } from "./dates";

type StatusInput = {
  status: string;
  expiryDate: Date | null;
};

/**
 * The status an owner actually cares about.
 *
 * The stored column only knows ACTIVE/EXPIRED/FROZEN/CANCELLED. "Expiring
 * soon" is a function of today's date, so persisting it would mean a row that
 * silently goes stale overnight. It's derived on read instead — always true.
 */
export function deriveStatus(member: StatusInput, tz?: string): DerivedStatus {
  if (member.status === "CANCELLED") return "CANCELLED";
  if (member.status === "FROZEN") return "FROZEN";
  if (!member.expiryDate) return "NO_PLAN";

  const remaining = daysBetween(todayInZone(tz), member.expiryDate);
  if (remaining < 0) return "EXPIRED";
  if (remaining <= EXPIRING_WINDOW_DAYS) return "EXPIRING";
  return "ACTIVE";
}

/** Days left on the membership; negative means days since it lapsed. */
export function daysRemaining(expiryDate: Date | null, tz?: string): number | null {
  if (!expiryDate) return null;
  return daysBetween(todayInZone(tz), expiryDate);
}

export const STATUS_STYLES: Record<DerivedStatus, string> = {
  ACTIVE: "bg-good-50 text-good-700 ring-good-500/20",
  EXPIRING: "bg-warn-50 text-warn-700 ring-warn-500/25",
  EXPIRED: "bg-bad-50 text-bad-700 ring-bad-500/20",
  FROZEN: "bg-info-50 text-info-700 ring-info-500/20",
  CANCELLED: "bg-ink-100 text-ink-600 ring-ink-400/20",
  NO_PLAN: "bg-ink-100 text-ink-500 ring-ink-400/20",
};

export const STATUS_DOTS: Record<DerivedStatus, string> = {
  ACTIVE: "bg-good-500",
  EXPIRING: "bg-warn-500",
  EXPIRED: "bg-bad-500",
  FROZEN: "bg-info-500",
  CANCELLED: "bg-ink-400",
  NO_PLAN: "bg-ink-300",
};

/**
 * Prisma `where` fragments for each derived status, so list filters and the
 * dashboard counts agree with `deriveStatus` instead of reimplementing it.
 */
export function statusWhere(status: DerivedStatus, tz?: string) {
  const today = todayInZone(tz);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + EXPIRING_WINDOW_DAYS);

  switch (status) {
    case "ACTIVE":
      return {
        status: "ACTIVE",
        expiryDate: { gt: horizon },
      };
    case "EXPIRING":
      return {
        status: "ACTIVE",
        expiryDate: { gte: today, lte: horizon },
      };
    case "EXPIRED":
      return {
        status: { in: ["ACTIVE", "EXPIRED"] },
        expiryDate: { lt: today },
      };
    case "FROZEN":
      return { status: "FROZEN" };
    case "CANCELLED":
      return { status: "CANCELLED" };
    case "NO_PLAN":
      return { expiryDate: null, status: { not: "CANCELLED" } };
  }
}
