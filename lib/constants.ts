// Single source of truth for every TEXT-column "enum" in the schema.
// SQLite has no native enums, so these constants + the Zod schemas in
// lib/validation.ts are what keep the columns honest.

export const GYM_STATUS = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"] as const;
export type GymStatus = (typeof GYM_STATUS)[number];

export const MEMBER_STATUS = ["ACTIVE", "EXPIRED", "FROZEN", "CANCELLED"] as const;
export type MemberStatus = (typeof MEMBER_STATUS)[number];

export const MEMBERSHIP_STATUS = ["UPCOMING", "ACTIVE", "EXPIRED", "CANCELLED", "FROZEN"] as const;

export const PAYMENT_MODES = ["CASH", "UPI", "CARD", "BANK", "OTHER"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const STAFF_ROLES = ["OWNER", "MANAGER", "FRONTDESK"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PLATFORM_ROLES = ["SUPERADMIN", "SUPPORT"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const LEAD_STATUS = ["NEW", "CONTACTED", "TRIAL", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const SOURCES = ["WALKIN", "REFERRAL", "INSTAGRAM", "GOOGLE", "PHONE", "OTHER"] as const;

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

export const MESSAGE_STATUS = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "SKIPPED",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export const WA_PROVIDERS = ["sandbox", "meta", "aisensy", "wati", "interakt"] as const;
export type WaProvider = (typeof WA_PROVIDERS)[number];

export const TEMPLATE_CATEGORIES = ["UTILITY", "MARKETING", "SERVICE"] as const;

/// Automation triggers the reminder engine understands.
export const TRIGGERS = [
  "BEFORE_EXPIRY",
  "ON_EXPIRY",
  "AFTER_EXPIRY",
  "WELCOME",
  "BIRTHDAY",
  "DUES_PENDING",
  "INACTIVITY",
] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const TRIGGER_LABELS: Record<Trigger, string> = {
  BEFORE_EXPIRY: "Before membership expires",
  ON_EXPIRY: "On the day it expires",
  AFTER_EXPIRY: "After it has expired (win-back)",
  WELCOME: "When a member joins",
  BIRTHDAY: "On the member's birthday",
  DUES_PENDING: "While a payment is outstanding",
  INACTIVITY: "When a member stops showing up",
};

export const TRIGGER_HELP: Record<Trigger, string> = {
  BEFORE_EXPIRY: "Counts back from the expiry date. The highest-ROI automation you have.",
  ON_EXPIRY: "Fires on the expiry date itself.",
  AFTER_EXPIRY: "Counts forward from expiry. Recovers members who drifted away.",
  WELCOME: "Counts forward from the join date. Sets the tone and confirms the plan.",
  BIRTHDAY: "Offset is ignored — always sent on the day.",
  DUES_PENDING: "Counts forward from the day a balance first appeared.",
  INACTIVITY: "Counts days since the member's last check-in.",
};

/// Member status shown in the UI is richer than the stored column: EXPIRING
/// is derived from `expiryDate`, never persisted.
export const DERIVED_STATUS = [
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "FROZEN",
  "CANCELLED",
  "NO_PLAN",
] as const;
export type DerivedStatus = (typeof DERIVED_STATUS)[number];

export const STATUS_LABELS: Record<DerivedStatus, string> = {
  ACTIVE: "Active",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
  FROZEN: "Frozen",
  CANCELLED: "Cancelled",
  NO_PLAN: "No plan",
};

/// Days before expiry at which a member is considered "expiring soon".
export const EXPIRING_WINDOW_DAYS = 7;

/// A member with no check-in for this long is "at risk" even if paid up —
/// the leading indicator of churn that expiry dates miss entirely.
export const INACTIVITY_RISK_DAYS = 14;

export const SOURCE_LABELS: Record<string, string> = {
  WALKIN: "Walk-in",
  REFERRAL: "Referral",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  PHONE: "Phone enquiry",
  OTHER: "Other",
};

export const MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK: "Bank transfer",
  OTHER: "Other",
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  FRONTDESK: "Front desk",
};
