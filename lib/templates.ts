import { durationLabel, money } from "./format";
import { fmtDate, relativeDayLabel } from "./dates";
import { daysRemaining } from "./status";

/**
 * Template rendering.
 *
 * Owners write copy with {{placeholders}} in the template editor. The same
 * renderer powers the live preview, the engine, and manual sends — so what
 * the owner previews is byte-for-byte what the member receives.
 */

export type TemplateVar = {
  key: string;
  label: string;
  example: string;
  group: "Member" | "Membership" | "Money" | "Gym";
};

export const TEMPLATE_VARS: TemplateVar[] = [
  { key: "member_name", label: "Full name", example: "Rahul Verma", group: "Member" },
  { key: "first_name", label: "First name", example: "Rahul", group: "Member" },
  { key: "member_code", label: "Member ID", example: "MBR-0042", group: "Member" },
  { key: "join_date", label: "Join date", example: "12 Mar 2026", group: "Member" },
  { key: "last_visit", label: "Last check-in", example: "3 days ago", group: "Member" },
  { key: "trainer_name", label: "Trainer", example: "Coach Imran", group: "Member" },

  { key: "plan_name", label: "Plan name", example: "3 Month Gym + Cardio", group: "Membership" },
  { key: "plan_duration", label: "Plan duration", example: "3 months", group: "Membership" },
  { key: "expiry_date", label: "Expiry date", example: "28 Nov 2026", group: "Membership" },
  { key: "days_left", label: "Days remaining", example: "7", group: "Membership" },
  { key: "days_overdue", label: "Days since expiry", example: "3", group: "Membership" },

  { key: "plan_price", label: "Plan price", example: "₹4,500", group: "Money" },
  { key: "amount_due", label: "Outstanding balance", example: "₹1,500", group: "Money" },
  { key: "renew_link", label: "Renewal / payment link", example: "https://pay.astryx.app/r/x7k2", group: "Money" },
  { key: "upi_id", label: "Gym UPI ID", example: "ironcore@upi", group: "Money" },

  { key: "gym_name", label: "Gym name", example: "Iron Core Fitness", group: "Gym" },
  { key: "gym_phone", label: "Gym phone", example: "+91 98765 43210", group: "Gym" },
  { key: "owner_name", label: "Owner name", example: "Suresh Kumar", group: "Gym" },
];

export const TEMPLATE_VAR_KEYS = TEMPLATE_VARS.map((v) => v.key);

type RenderContext = {
  member?: {
    name: string;
    code: string;
    joinDate: Date;
    expiryDate: Date | null;
    activePlanName: string | null;
    balanceDue: number;
    lastCheckInAt: Date | null;
    trainer?: { name: string } | null;
  } | null;
  lead?: { name: string } | null;
  gym: {
    name: string;
    phone: string;
    ownerName: string;
    timezone?: string;
    upiId?: string | null;
  };
  membership?: {
    planName: string;
    durationDays: number;
    price: number;
    payable: number;
    endDate: Date;
  } | null;
  extra?: Record<string, string>;
};

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export function buildVarMap(ctx: RenderContext): Record<string, string> {
  const m = ctx.member;
  const tz = ctx.gym.timezone;
  const remaining = m ? daysRemaining(m.expiryDate, tz) : null;
  const name = m?.name ?? ctx.lead?.name ?? "there";

  const map: Record<string, string> = {
    member_name: name,
    first_name: firstName(name),
    member_code: m?.code ?? "—",
    join_date: m ? fmtDate(m.joinDate) : "—",
    last_visit: m?.lastCheckInAt ? relativeDayLabel(m.lastCheckInAt, tz) : "no visits yet",
    trainer_name: m?.trainer?.name ?? "your trainer",

    plan_name: ctx.membership?.planName ?? m?.activePlanName ?? "your plan",
    plan_duration: ctx.membership ? durationLabel(ctx.membership.durationDays) : "—",
    expiry_date: fmtDate(ctx.membership?.endDate ?? m?.expiryDate ?? null),
    days_left: remaining !== null && remaining >= 0 ? String(remaining) : "0",
    days_overdue: remaining !== null && remaining < 0 ? String(Math.abs(remaining)) : "0",

    plan_price: money(ctx.membership?.payable ?? ctx.membership?.price ?? 0),
    amount_due: money(m?.balanceDue ?? 0),
    renew_link: ctx.extra?.renew_link ?? "",
    upi_id: ctx.extra?.upi_id ?? ctx.gym.upiId ?? "",

    gym_name: ctx.gym.name,
    gym_phone: ctx.gym.phone,
    owner_name: ctx.gym.ownerName,
  };

  return { ...map, ...(ctx.extra ?? {}) };
}

/**
 * Substitutes {{var}} tokens. Whitespace inside the braces is tolerated.
 * Unknown tokens are left intact so a typo is visible in the preview rather
 * than silently vanishing from a message a member will read.
 */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : value;
  });
}

export function render(body: string, ctx: RenderContext): string {
  return renderTemplate(body, buildVarMap(ctx));
}

/** Placeholders used in `body` that aren't real variables. */
export function unknownVars(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    if (!TEMPLATE_VAR_KEYS.includes(m[1])) found.add(m[1]);
  }
  return [...found];
}

/** Sample render for the template editor's preview pane. */
export function previewRender(body: string): string {
  const examples: Record<string, string> = {};
  for (const v of TEMPLATE_VARS) examples[v.key] = v.example;
  return renderTemplate(body, examples);
}
