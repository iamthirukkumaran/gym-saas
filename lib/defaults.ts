/**
 * Everything a brand-new tenant starts with.
 *
 * Onboarding is the whole game for this buyer: a gym owner who has to write
 * ten WhatsApp templates before seeing value will never finish. So a gym
 * provisioned by Astryx arrives with working automations on day one, and the
 * owner edits copy rather than authoring it.
 */

export const DEFAULT_SAAS_PLANS = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For a single gym finding its feet",
    priceMonthly: 99_900, // ₹999
    priceYearly: 999_000, // ₹9,990 — two months free
    memberLimit: 150,
    staffLimit: 2,
    waMessageLimit: 1_000,
    sortOrder: 1,
    isDefault: true,
    features: [
      "Up to 150 active members",
      "Unlimited membership plans",
      "Automated WhatsApp renewal reminders",
      "Payment & dues tracking",
      "CSV import from your spreadsheet",
      "2 staff logins",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "For a busy gym that wants to stop losing members",
    priceMonthly: 199_900, // ₹1,999
    priceYearly: 1_999_000,
    memberLimit: 500,
    staffLimit: 5,
    waMessageLimit: 5_000,
    sortOrder: 2,
    isDefault: false,
    features: [
      "Up to 500 active members",
      "Everything in Starter",
      "Full automation library (win-back, birthdays, dues)",
      "Attendance & inactivity alerts",
      "Enquiry pipeline with follow-ups",
      "Broadcast campaigns",
      "Revenue & retention reports",
      "5 staff logins",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For multi-trainer gyms and small chains",
    priceMonthly: 399_900, // ₹3,999
    priceYearly: 3_999_000,
    memberLimit: -1,
    staffLimit: 20,
    waMessageLimit: -1,
    sortOrder: 3,
    isDefault: false,
    features: [
      "Unlimited members",
      "Everything in Growth",
      "Unlimited WhatsApp messages",
      "Bring your own WhatsApp Business number",
      "Custom automation rules",
      "Priority support on WhatsApp",
      "20 staff logins",
    ],
  },
];

type TemplateSeed = {
  key: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "SERVICE";
  body: string;
  description: string;
  defaultRule: boolean;
  trigger?: string;
  defaultOffset?: number;
  sortOrder: number;
};

/**
 * Copy notes: short lines, one clear action, the amount and date stated
 * plainly, and the gym's name in the first line so it isn't mistaken for
 * spam. Renewal messages always carry the link — the conversion difference
 * between "come pay at the desk" and a tappable link is the entire pitch.
 */
export const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    key: "renewal_7day",
    name: "Renewal reminder — 7 days before",
    category: "UTILITY",
    description: "The workhorse. Early enough to plan, late enough to feel relevant.",
    defaultRule: true,
    trigger: "BEFORE_EXPIRY",
    defaultOffset: 7,
    sortOrder: 1,
    body: `Hi {{first_name}}! 👋

Your *{{plan_name}}* at {{gym_name}} expires on *{{expiry_date}}* — that's {{days_left}} days away.

Renew now and keep your streak going:
{{renew_link}}

Questions? Just reply here.
— Team {{gym_name}}`,
  },
  {
    key: "renewal_3day",
    name: "Renewal reminder — 3 days before",
    category: "UTILITY",
    description: "Second nudge for members who didn't act on the first.",
    defaultRule: true,
    trigger: "BEFORE_EXPIRY",
    defaultOffset: 3,
    sortOrder: 2,
    body: `{{first_name}}, quick reminder ⏳

Only *{{days_left}} days* left on your {{plan_name}} at {{gym_name}} (expires {{expiry_date}}).

Tap to renew in a few seconds:
{{renew_link}}

Don't lose your momentum 💪`,
  },
  {
    key: "renewal_1day",
    name: "Renewal reminder — 1 day before",
    category: "UTILITY",
    description: "Last call before the plan lapses.",
    defaultRule: true,
    trigger: "BEFORE_EXPIRY",
    defaultOffset: 1,
    sortOrder: 3,
    body: `Hi {{first_name}}, your {{gym_name}} membership expires *tomorrow* ({{expiry_date}}).

Renew here so there's no break in your training:
{{renew_link}}

See you at the gym! 🏋️`,
  },
  {
    key: "expiry_today",
    name: "Expires today",
    category: "UTILITY",
    description: "Sent on the expiry date itself.",
    defaultRule: true,
    trigger: "ON_EXPIRY",
    defaultOffset: 0,
    sortOrder: 4,
    body: `{{first_name}}, today is the last day of your {{plan_name}} at {{gym_name}}.

Renew now to continue without a gap:
{{renew_link}}

We'd hate to see you stop here 🙌`,
  },
  {
    key: "winback_3day",
    name: "Win-back — 3 days after expiry",
    category: "MARKETING",
    description: "Catches members who simply forgot. Highest win-back rate of the set.",
    defaultRule: true,
    trigger: "AFTER_EXPIRY",
    defaultOffset: 3,
    sortOrder: 5,
    body: `Hey {{first_name}}, we've missed you at {{gym_name}} 🙂

Your membership ended {{days_overdue}} days ago. Everything's still here — your plan, your locker, your trainer.

Pick up where you left off:
{{renew_link}}`,
  },
  {
    key: "winback_15day",
    name: "Win-back — 15 days after expiry",
    category: "MARKETING",
    description: "Final attempt, with a reason to reply.",
    defaultRule: true,
    trigger: "AFTER_EXPIRY",
    defaultOffset: 15,
    sortOrder: 6,
    body: `{{first_name}}, it's been {{days_overdue}} days since your {{gym_name}} membership ended.

If something wasn't working for you — timings, crowd, trainer — tell us honestly. We read every reply.

And if you're ready to restart:
{{renew_link}}

— {{owner_name}}, {{gym_name}}`,
  },
  {
    key: "welcome",
    name: "Welcome message",
    category: "UTILITY",
    description: "Confirms the plan in writing and sets expectations. Cuts 'when does mine expire?' calls.",
    defaultRule: true,
    trigger: "WELCOME",
    defaultOffset: 0,
    sortOrder: 7,
    body: `Welcome to {{gym_name}}, {{first_name}}! 🎉

Here are your details:
• Member ID: *{{member_code}}*
• Plan: {{plan_name}}
• Valid till: *{{expiry_date}}*

Save this number — we'll send renewal reminders here so you never lose access.

Let's get to work 💪`,
  },
  {
    key: "birthday",
    name: "Birthday wish",
    category: "MARKETING",
    description: "Cheap goodwill that members genuinely remember.",
    defaultRule: true,
    trigger: "BIRTHDAY",
    defaultOffset: 0,
    sortOrder: 8,
    body: `Happy birthday, {{first_name}}! 🎂

Everyone at {{gym_name}} wishes you a strong, healthy year ahead.

Drop by today — the first set's on us 😄`,
  },
  {
    key: "dues_reminder",
    name: "Pending payment reminder",
    category: "UTILITY",
    description: "Recovers the balance owners usually write off.",
    defaultRule: true,
    trigger: "DUES_PENDING",
    defaultOffset: 3,
    sortOrder: 9,
    body: `Hi {{first_name}}, a small reminder from {{gym_name}}.

Pending balance on your {{plan_name}}: *{{amount_due}}*

You can clear it here:
{{renew_link}}

Already paid? Ignore this and let us know — we'll fix our records.`,
  },
  {
    key: "inactivity_nudge",
    name: "We haven't seen you",
    category: "UTILITY",
    description: "Fires on silence, not on expiry — catches churn weeks earlier.",
    defaultRule: true,
    trigger: "INACTIVITY",
    defaultOffset: 14,
    sortOrder: 10,
    body: `{{first_name}}, we noticed you haven't checked in since {{last_visit}} 👀

Your {{plan_name}} is still active till {{expiry_date}} — those days are paid for, so come use them!

Need a fresh plan or a change of timing? Reply and we'll sort it out.
— Team {{gym_name}}`,
  },
  {
    key: "payment_receipt",
    name: "Payment receipt",
    category: "UTILITY",
    description: "Sent manually after collecting cash or UPI. Builds trust and kills disputes.",
    defaultRule: false,
    sortOrder: 11,
    body: `Payment received ✅

{{gym_name}} confirms:
• Member: {{member_name}} ({{member_code}})
• Plan: {{plan_name}}
• Valid till: *{{expiry_date}}*

Thank you, {{first_name}}! Keep this message as your receipt.`,
  },
  {
    key: "offer_broadcast",
    name: "Offer / announcement",
    category: "MARKETING",
    description: "Starting point for broadcasts. Edit before every campaign.",
    defaultRule: false,
    sortOrder: 12,
    body: `Hi {{first_name}}! 📣

{{gym_name}} has something for you this month — write your offer here.

Reply *YES* and we'll hold a spot for you.`,
  },
];

/** Plan catalogue a new gym starts with. Prices are typical Tier-2 India. */
export const DEFAULT_MEMBERSHIP_PLANS = [
  { name: "1 Month", durationDays: 30, price: 150_000, joiningFee: 50_000, sortOrder: 1, description: "Monthly gym access" },
  { name: "3 Months", durationDays: 90, price: 400_000, joiningFee: 0, sortOrder: 2, description: "Quarterly — best seller" },
  { name: "6 Months", durationDays: 180, price: 700_000, joiningFee: 0, sortOrder: 3, description: "Half-yearly" },
  { name: "12 Months", durationDays: 365, price: 1_200_000, joiningFee: 0, sortOrder: 4, description: "Annual — best value" },
  { name: "Personal Training — 1 Month", durationDays: 30, price: 600_000, joiningFee: 0, sortOrder: 5, description: "12 sessions with a dedicated trainer" },
];
