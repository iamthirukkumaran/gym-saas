import { z } from "zod";

import {
  GENDERS,
  LEAD_STATUS,
  PAYMENT_MODES,
  SOURCES,
  STAFF_ROLES,
  TEMPLATE_CATEGORIES,
  TRIGGERS,
  WA_PROVIDERS,
} from "./constants";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * Every server action validates its input here before touching the database.
 * The TEXT columns standing in for enums are only as trustworthy as this file.
 */

// Validates, then canonicalises to E.164 so duplicate detection and the
// WhatsApp adapters always see the same string for the same number.
const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine(isValidPhone, "Enter a valid 10-digit mobile number")
  .transform((v) => normalizePhone(v));

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || isValidPhone(v), "Enter a valid 10-digit mobile number")
  .transform((v) => (v ? normalizePhone(v) : undefined));

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

/** Rupee amount from a form field → integer paise. */
const rupees = z.coerce
  .number({ error: "Enter a valid amount" })
  .min(0, "Amount cannot be negative")
  .max(10_000_000, "That amount looks wrong")
  .transform((v) => Math.round(v * 100));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Password is required"),
});

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  phone,
  altPhone: optionalPhone,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
  gender: z.enum(GENDERS).optional(),
  dob: dateString.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  joinDate: dateString,
  addressLine: optionalText(240),
  city: optionalText(80),
  heightCm: z.coerce.number().int().min(60).max(260).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  weightKg: z.coerce.number().min(20).max(400).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  goal: optionalText(160),
  medicalNotes: optionalText(500),
  emergencyName: optionalText(120),
  emergencyPhone: optionalPhone,
  trainerId: optionalText(40),
  source: z.enum(SOURCES).optional(),
  notes: optionalText(1000),
  waOptOut: z.coerce.boolean().optional().default(false),
});

export const assignPlanSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().optional().transform((v) => (v ? v : undefined)),
  customName: optionalText(120),
  customDurationDays: z.coerce.number().int().min(1).max(3650).optional(),
  customPrice: rupees.optional(),
  startDate: dateString,
  discount: rupees.optional().default(0),
  autoRenew: z.coerce.boolean().optional().default(false),
  isRenewal: z.coerce.boolean().optional().default(false),
  // Optional payment captured in the same step — the common front-desk flow.
  payNow: rupees.optional().default(0),
  payMode: z.enum(PAYMENT_MODES).optional().default("CASH"),
});

export const paymentSchema = z.object({
  memberId: z.string().min(1),
  membershipId: z.string().optional().transform((v) => (v ? v : undefined)),
  amount: rupees.refine((v) => v > 0, "Amount must be more than zero"),
  mode: z.enum(PAYMENT_MODES),
  paidAt: dateString,
  reference: optionalText(80),
  notes: optionalText(300),
});

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  durationDays: z.coerce.number().int().min(1, "At least 1 day").max(3650),
  price: rupees,
  joiningFee: rupees.optional().default(0),
  description: optionalText(300),
  active: z.coerce.boolean().optional().default(true),
});

export const templateSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,48}$/, "Use lowercase letters, numbers and underscores"),
  name: z.string().trim().min(2).max(80),
  category: z.enum(TEMPLATE_CATEGORIES),
  body: z.string().trim().min(10, "Message is too short").max(1024, "WhatsApp caps body text at 1024 characters"),
  active: z.coerce.boolean().optional().default(true),
});

export const ruleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  trigger: z.enum(TRIGGERS),
  offsetDays: z.coerce.number().int().min(0).max(365),
  templateKey: z.string().trim().min(1, "Pick a message template"),
  enabled: z.coerce.boolean().optional().default(true),
  sendHour: z.coerce.number().int().min(0).max(23).optional(),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: optionalText(160),
  source: z.enum(SOURCES).optional(),
  interest: optionalText(160),
  status: z.enum(LEAD_STATUS).optional().default("NEW"),
  followUpAt: dateString.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  notes: optionalText(600),
});

export const gymProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone,
  addressLine: optionalText(240),
  city: optionalText(80),
  state: optionalText(80),
  pincode: optionalText(12),
  gstin: optionalText(20),
  upiId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => !v || /^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/.test(v),
      "Enter a valid UPI ID, e.g. yourgym@okaxis",
    ),
  timezone: z.string().trim().min(3).max(64),
});

export const automationSettingsSchema = z.object({
  autoRemindersEnabled: z.coerce.boolean().optional().default(false),
  reminderSendHour: z.coerce.number().int().min(0).max(23),
  quietHoursStart: z.coerce.number().int().min(0).max(23),
  quietHoursEnd: z.coerce.number().int().min(0).max(23),
});

export const waConnectionSchema = z.object({
  waProvider: z.enum(WA_PROVIDERS),
  waSenderDisplay: optionalText(80),
  waPhoneNumberId: optionalText(80),
  waBusinessId: optionalText(80),
  waAccessToken: optionalText(1000),
  waApiKey: optionalText(500),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  phone: optionalPhone,
  role: z.enum(STAFF_ROLES),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const provisionGymSchema = z.object({
  name: z.string().trim().min(2, "Gym name is required").max(120),
  ownerName: z.string().trim().min(2, "Owner name is required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  phone,
  city: optionalText(80),
  state: optionalText(80),
  planKey: z.string().trim().min(1, "Choose a subscription plan"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  trialDays: z.coerce.number().int().min(0).max(90).default(14),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  seedDemoData: z.coerce.boolean().optional().default(false),
});

export const saasPlanSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{2,32}$/, "Lowercase letters, numbers, dashes"),
  name: z.string().trim().min(2).max(60),
  tagline: optionalText(160),
  priceMonthly: rupees,
  priceYearly: rupees,
  memberLimit: z.coerce.number().int().min(-1).max(1_000_000),
  staffLimit: z.coerce.number().int().min(1).max(1000),
  waMessageLimit: z.coerce.number().int().min(-1).max(10_000_000),
  features: z.string().optional().default(""),
  active: z.coerce.boolean().optional().default(true),
});

export const broadcastSchema = z.object({
  name: z.string().trim().min(2).max(80),
  body: z.string().trim().min(10).max(1024),
  segment: z.enum(["ALL", "ACTIVE", "EXPIRING", "EXPIRED", "DUES", "INACTIVE"]),
});

/**
 * Turns a Zod failure into `{ field: message }` for inline form errors.
 * Server actions return this shape so the client never has to parse Zod.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; errors: Record<string, string> };
