"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Button, Card, CardHeader, Divider, Field, Input, Row, Select, Textarea } from "../ui";
import { IconPlay } from "../icons";
import { money, toRupees } from "@/lib/format";
import type { FormState } from "@/lib/validation";

// ── Provision a new tenant ──────────────────────────────────────────────────

export function ProvisionGymForm({
  action,
  plans,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  plans: { key: string; name: string; priceMonthly: number; priceYearly: number; memberLimit: number }[];
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [planKey, setPlanKey] = useState(plans[0]?.key ?? "");
  const [cycle, setCycle] = useState("MONTHLY");
  const [trialDays, setTrialDays] = useState("14");
  const errors = state && !state.ok ? state.errors : {};

  const plan = plans.find((p) => p.key === planKey);
  const amount = plan ? (cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly) : 0;

  // Mirrors lib/provisioning.provisionGym so the admin knows exactly what the
  // tenant will arrive with.
  const provisioned = [
    "Gym account and owner login",
    "5 starter membership plans (1/3/6/12 months + PT)",
    "12 WhatsApp templates, ready to edit",
    "10 automations wired and enabled",
    "Sandbox WhatsApp provider (works immediately)",
    "Subscription record and billing period",
  ];

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}

        <Card>
          <CardHeader title="Gym details" subtitle="What the owner sees in their dashboard." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" htmlFor="name" error={errors.name} required className="sm:col-span-2">
              <Input id="name" name="name" placeholder="Iron Core Fitness" required />
            </Field>
            <Field label="Owner's name" htmlFor="ownerName" error={errors.ownerName} required>
              <Input id="ownerName" name="ownerName" placeholder="Suresh Kumar" required />
            </Field>
            <Field label="Gym phone" htmlFor="phone" error={errors.phone} required>
              <Input id="phone" name="phone" type="tel" placeholder="98765 43210" required />
            </Field>
            <Field label="City" htmlFor="city" error={errors.city}>
              <Input id="city" name="city" placeholder="Coimbatore" />
            </Field>
            <Field label="State" htmlFor="state" error={errors.state}>
              <Input id="state" name="state" placeholder="Tamil Nadu" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Owner login"
            subtitle="Share these with the owner. They can change the password after signing in."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Login email"
              htmlFor="email"
              error={errors.email}
              hint="Also the account's billing contact."
              required
            >
              <Input id="email" name="email" type="email" placeholder="owner@gym.in" required />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="password"
              error={errors.password}
              hint="At least 8 characters."
              required
            >
              <Input id="password" name="password" type="text" autoComplete="off" required />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription" />
          <div className="mt-4 space-y-4">
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-ink-700">Plan</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {plans.map((p) => (
                  <label
                    key={p.key}
                    className={
                      planKey === p.key
                        ? "cursor-pointer rounded-xl border-2 border-brand-500 bg-brand-50 p-3"
                        : "cursor-pointer rounded-xl border border-ink-200 p-3 hover:border-ink-300"
                    }
                  >
                    <input
                      type="radio"
                      name="planKey"
                      value={p.key}
                      checked={planKey === p.key}
                      onChange={() => setPlanKey(p.key)}
                      className="sr-only"
                    />
                    <span className="block text-[13.5px] font-semibold text-ink-900">{p.name}</span>
                    <span className="nums mt-0.5 block text-[12px] text-ink-600">
                      {money(p.priceMonthly)}/mo
                    </span>
                    <span className="nums block text-[11px] text-ink-500">
                      {p.memberLimit === -1 ? "unlimited members" : `${p.memberLimit} members`}
                    </span>
                  </label>
                ))}
              </div>
              {errors.planKey ? (
                <p className="mt-1.5 text-xs font-medium text-bad-600">{errors.planKey}</p>
              ) : null}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Billing cycle" htmlFor="billingCycle" error={errors.billingCycle}>
                <Select
                  id="billingCycle"
                  name="billingCycle"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly (2 months free)</option>
                </Select>
              </Field>
              <Field
                label="Free trial (days)"
                htmlFor="trialDays"
                error={errors.trialDays}
                hint="Set 0 to start billing immediately."
              >
                <Input
                  id="trialDays"
                  name="trialDays"
                  type="number"
                  min="0"
                  max="90"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-24">
          <CardHeader title="What gets created" />
          <ul className="mt-3 space-y-1.5">
            {provisioned.map((p) => (
              <li key={p} className="flex gap-2 text-[12.5px] text-ink-600">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-good-500" />
                {p}
              </li>
            ))}
          </ul>

          <Divider className="my-4" />

          <dl>
            <Row label="Plan" value={plan?.name ?? "—"} />
            <Row label="Cycle" value={cycle.toLowerCase()} />
            <Row label="Trial" value={Number(trialDays) > 0 ? `${trialDays} days` : "none"} />
            <Row
              label={Number(trialDays) > 0 ? "Billed after trial" : "Billed now"}
              value={<span className="font-semibold">{money(amount)}</span>}
            />
          </dl>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={isPending}>
            {isPending ? "Provisioning…" : "Create gym account"}
          </Button>
          <Link
            href="/admin/gyms"
            className="mt-2 block text-center text-[13px] font-medium text-ink-500 hover:text-ink-800"
          >
            Cancel
          </Link>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-500">
            Everything is created in one transaction — a half-built tenant can never exist.
          </p>
        </Card>
      </div>
    </form>
  );
}

// ── SaaS plan editor ────────────────────────────────────────────────────────

export function SaasPlanForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  values?: {
    key?: string;
    name?: string;
    tagline?: string;
    priceMonthly?: number;
    priceYearly?: number;
    memberLimit?: number;
    staffLimit?: number;
    waMessageLimit?: number;
    features?: string[];
    active?: boolean;
  };
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-4">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" htmlFor="sp-name" error={errors.name} required>
          <Input id="sp-name" name="name" defaultValue={values?.name} required />
        </Field>
        <Field
          label="Key"
          htmlFor="sp-key"
          error={errors.key}
          hint="Used in code and URLs. Avoid changing it once live."
          required
        >
          <Input id="sp-key" name="key" defaultValue={values?.key} placeholder="growth" required />
        </Field>
        <Field label="Tagline" htmlFor="sp-tagline" error={errors.tagline} className="sm:col-span-2">
          <Input id="sp-tagline" name="tagline" defaultValue={values?.tagline} />
        </Field>
        <Field label="Monthly price (₹)" htmlFor="sp-pm" error={errors.priceMonthly} required>
          <Input
            id="sp-pm"
            name="priceMonthly"
            type="number"
            min="0"
            defaultValue={values?.priceMonthly !== undefined ? String(toRupees(values.priceMonthly)) : ""}
            required
          />
        </Field>
        <Field label="Yearly price (₹)" htmlFor="sp-py" error={errors.priceYearly} required>
          <Input
            id="sp-py"
            name="priceYearly"
            type="number"
            min="0"
            defaultValue={values?.priceYearly !== undefined ? String(toRupees(values.priceYearly)) : ""}
            required
          />
        </Field>
        <Field
          label="Member limit"
          htmlFor="sp-ml"
          error={errors.memberLimit}
          hint="-1 for unlimited"
          required
        >
          <Input id="sp-ml" name="memberLimit" type="number" min="-1" defaultValue={values?.memberLimit ?? 150} required />
        </Field>
        <Field label="Staff logins" htmlFor="sp-sl" error={errors.staffLimit} required>
          <Input id="sp-sl" name="staffLimit" type="number" min="1" defaultValue={values?.staffLimit ?? 2} required />
        </Field>
        <Field
          label="Monthly message limit"
          htmlFor="sp-wl"
          error={errors.waMessageLimit}
          hint="-1 for unlimited"
          required
        >
          <Input id="sp-wl" name="waMessageLimit" type="number" min="-1" defaultValue={values?.waMessageLimit ?? 1000} required />
        </Field>
        <Field
          label="Features"
          htmlFor="sp-features"
          error={errors.features}
          hint="One per line. Shown on the pricing page and in the owner's billing screen."
          className="sm:col-span-2"
        >
          <Textarea
            id="sp-features"
            name="features"
            rows={6}
            defaultValue={values?.features?.join("\n")}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="active"
          value="true"
          defaultChecked={values?.active ?? true}
          className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
        />
        <span className="text-[13px] font-medium text-ink-800">
          Active — shown on the public pricing page
        </span>
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

// ── Run engine across all tenants ───────────────────────────────────────────

export function RunAllEnginesButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction, isPending] = useActionState(
    async () => action(),
    null as FormState | null,
  );

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <Button type="submit" disabled={isPending}>
          <IconPlay className="size-3.5" />
          {isPending ? "Running across all tenants…" : "Run engine now"}
        </Button>
      </form>
      {state ? (
        <Alert tone={state.ok ? "good" : "bad"}>
          {state.ok ? state.message : state.errors._form}
        </Alert>
      ) : null}
    </div>
  );
}
