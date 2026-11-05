"use client";

import { useActionState, useState } from "react";

import { Alert, Button, Card, CardHeader, Divider, Field, Input, Select, Textarea, cn } from "../ui";
import { IconCheck, IconWhatsApp } from "../icons";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/constants";
import { toRupees } from "@/lib/format";
import type { FormState } from "@/lib/validation";

// ── Gym profile ─────────────────────────────────────────────────────────────

export function GymProfileForm({
  action,
  values,
  canEdit,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  values: Record<string, string>;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <Card>
      <CardHeader
        title="Gym details"
        subtitle="Your gym's name appears in every WhatsApp message you send."
      />

      {!canEdit ? (
        <div className="mt-4">
          <Alert tone="info">Only an owner or manager can change these details.</Alert>
        </div>
      ) : null}

      <form action={formAction} className="mt-4 space-y-4">
        {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gym name" htmlFor="name" error={errors.name} required>
            <Input id="name" name="name" defaultValue={values.name} disabled={!canEdit} required />
          </Field>
          <Field label="Owner name" htmlFor="ownerName" error={errors.ownerName} required>
            <Input id="ownerName" name="ownerName" defaultValue={values.ownerName} disabled={!canEdit} required />
          </Field>
          <Field
            label="Gym phone"
            htmlFor="phone"
            error={errors.phone}
            hint="Members see this in messages, and test sends go here."
            required
          >
            <Input id="phone" name="phone" type="tel" defaultValue={values.phone} disabled={!canEdit} required />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={errors.timezone} required>
            <Select id="timezone" name="timezone" defaultValue={values.timezone} disabled={!canEdit} required>
              {["Asia/Kolkata", "Asia/Dubai", "Asia/Karachi", "Asia/Colombo", "Asia/Dhaka", "Asia/Singapore", "UTC"].map(
                (tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Address" htmlFor="addressLine" error={errors.addressLine} className="sm:col-span-2">
            <Input id="addressLine" name="addressLine" defaultValue={values.addressLine} disabled={!canEdit} />
          </Field>
          <Field label="City" htmlFor="city" error={errors.city}>
            <Input id="city" name="city" defaultValue={values.city} disabled={!canEdit} />
          </Field>
          <Field label="State" htmlFor="state" error={errors.state}>
            <Input id="state" name="state" defaultValue={values.state} disabled={!canEdit} />
          </Field>
          <Field label="PIN code" htmlFor="pincode" error={errors.pincode}>
            <Input id="pincode" name="pincode" defaultValue={values.pincode} disabled={!canEdit} />
          </Field>
          <Field label="GSTIN" htmlFor="gstin" error={errors.gstin} hint="Printed on member invoices.">
            <Input id="gstin" name="gstin" defaultValue={values.gstin} disabled={!canEdit} />
          </Field>
          <Field
            label="UPI ID"
            htmlFor="upiId"
            error={errors.upiId}
            hint="Puts a one-tap 'Pay by UPI' button on every renewal link you send."
            className="sm:col-span-2"
          >
            <Input
              id="upiId"
              name="upiId"
              defaultValue={values.upiId}
              placeholder="yourgym@okaxis"
              disabled={!canEdit}
            />
          </Field>
        </div>

        {canEdit ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save gym details"}
          </Button>
        ) : null}
      </form>
    </Card>
  );
}

// ── Membership plan ─────────────────────────────────────────────────────────

const DURATION_PRESETS = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
];

export function PlanForm({
  action,
  values,
  submitLabel,
  onCancelHref,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  values?: {
    name?: string;
    durationDays?: number;
    price?: number;
    joiningFee?: number;
    description?: string;
    active?: boolean;
  };
  submitLabel: string;
  onCancelHref?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [days, setDays] = useState(String(values?.durationDays ?? 30));
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-4">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" htmlFor="plan-name" error={errors.name} required>
          <Input id="plan-name" name="name" defaultValue={values?.name} placeholder="3 Months" required />
        </Field>

        <Field label="Duration (days)" htmlFor="plan-days" error={errors.durationDays} required>
          <Input
            id="plan-days"
            name="durationDays"
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(String(p.days))}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                  Number(days) === p.days
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-500 hover:bg-ink-50",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Price (₹)" htmlFor="plan-price" error={errors.price} required>
          <Input
            id="plan-price"
            name="price"
            type="number"
            min="0"
            defaultValue={values?.price !== undefined ? String(toRupees(values.price)) : ""}
            placeholder="4000"
            required
          />
        </Field>

        <Field
          label="Joining fee (₹)"
          htmlFor="plan-fee"
          error={errors.joiningFee}
          hint="Charged only on a member's first plan, never on renewal."
        >
          <Input
            id="plan-fee"
            name="joiningFee"
            type="number"
            min="0"
            defaultValue={values?.joiningFee !== undefined ? String(toRupees(values.joiningFee)) : "0"}
          />
        </Field>

        <Field label="Description" htmlFor="plan-desc" error={errors.description} className="sm:col-span-2">
          <Textarea
            id="plan-desc"
            name="description"
            rows={2}
            defaultValue={values?.description}
            placeholder="What's included — shown when assigning a plan."
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
          Active — offered when assigning or renewing
        </span>
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

// ── Staff ───────────────────────────────────────────────────────────────────

export function StaffForm({
  action,
  values,
  submitLabel,
  isEdit,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  values?: { name?: string; email?: string; phone?: string; role?: string };
  submitLabel: string;
  isEdit?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-4">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="staff-name" error={errors.name} required>
          <Input id="staff-name" name="name" defaultValue={values?.name} required />
        </Field>
        <Field label="Email (their login)" htmlFor="staff-email" error={errors.email} required>
          <Input id="staff-email" name="email" type="email" defaultValue={values?.email} required />
        </Field>
        <Field label="Phone" htmlFor="staff-phone" error={errors.phone}>
          <Input id="staff-phone" name="phone" type="tel" defaultValue={values?.phone} />
        </Field>
        <Field label="Role" htmlFor="staff-role" error={errors.role} required>
          <Select id="staff-role" name="role" defaultValue={values?.role ?? "FRONTDESK"} required>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={isEdit ? "New password" : "Password"}
          htmlFor="staff-password"
          error={errors.password}
          hint={isEdit ? "Leave blank to keep the current password." : "At least 8 characters."}
          required={!isEdit}
        >
          <Input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required={!isEdit}
          />
        </Field>
      </div>

      <div className="rounded-lg bg-ink-50 p-3 text-[11.5px] leading-relaxed text-ink-600">
        <p>
          <strong className="font-semibold text-ink-700">Owner</strong> — everything,
          including staff and billing.
        </p>
        <p>
          <strong className="font-semibold text-ink-700">Manager</strong> — members,
          payments, automations and gym settings. No staff or billing.
        </p>
        <p>
          <strong className="font-semibold text-ink-700">Front desk</strong> — members,
          check-ins, payments and enquiries. No settings.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

// ── WhatsApp connection ─────────────────────────────────────────────────────

export function WaConnectionForm({
  action,
  testAction,
  providers,
  values,
  gymPhone,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  testAction: () => Promise<FormState>;
  providers: { name: string; label: string }[];
  values: {
    waProvider: string;
    waSenderDisplay: string;
    waPhoneNumberId: string;
    waBusinessId: string;
    hasToken: boolean;
    hasApiKey: boolean;
  };
  gymPhone: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [testState, testFormAction, isTesting] = useActionState(
    async () => testAction(),
    null as FormState | null,
  );
  const [provider, setProvider] = useState(values.waProvider);
  const errors = state && !state.ok ? state.errors : {};

  const needsMeta = provider === "meta";
  const needsBsp = ["aisensy", "wati", "interakt"].includes(provider);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="WhatsApp delivery"
          subtitle="Where your reminders actually get sent from."
        />

        <form action={formAction} className="mt-4 space-y-4">
          {errors._form ? <Alert tone="warn">{errors._form}</Alert> : null}
          {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-700">Provider</legend>
            <div className="space-y-2">
              {providers.map((p) => (
                <label
                  key={p.name}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                    provider === p.name
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15"
                      : "border-ink-200 hover:border-ink-300",
                  )}
                >
                  <input
                    type="radio"
                    name="waProvider"
                    value={p.name}
                    checked={provider === p.name}
                    onChange={() => setProvider(p.name)}
                    className="mt-0.5 size-4 border-ink-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink-900">{p.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">
                      {p.name === "sandbox"
                        ? "Runs every automation and logs the exact message, without delivering it. Perfect while you wait for Meta approval."
                        : p.name === "meta"
                          ? "Cheapest per message. Needs a verified Meta Business account and approved templates."
                          : "Easier onboarding than Meta direct, slightly higher per-message cost."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Sender display name"
            htmlFor="waSenderDisplay"
            error={errors.waSenderDisplay}
            hint="How your gym appears to members."
          >
            <Input id="waSenderDisplay" name="waSenderDisplay" defaultValue={values.waSenderDisplay} />
          </Field>

          {needsMeta ? (
            <>
              <Divider />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number ID" htmlFor="waPhoneNumberId" error={errors.waPhoneNumberId}>
                  <Input id="waPhoneNumberId" name="waPhoneNumberId" defaultValue={values.waPhoneNumberId} />
                </Field>
                <Field label="WhatsApp Business account ID" htmlFor="waBusinessId" error={errors.waBusinessId}>
                  <Input id="waBusinessId" name="waBusinessId" defaultValue={values.waBusinessId} />
                </Field>
                <Field
                  label="Permanent access token"
                  htmlFor="waAccessToken"
                  error={errors.waAccessToken}
                  hint={values.hasToken ? "A token is saved. Leave blank to keep it." : "From your Meta app's System User."}
                  className="sm:col-span-2"
                >
                  <Input
                    id="waAccessToken"
                    name="waAccessToken"
                    type="password"
                    autoComplete="off"
                    placeholder={values.hasToken ? "•••••••••••••• (saved)" : "EAAG…"}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {needsBsp ? (
            <>
              <Divider />
              <Field
                label="API key"
                htmlFor="waApiKey"
                error={errors.waApiKey}
                hint={values.hasApiKey ? "A key is saved. Leave blank to keep it." : "From your provider's dashboard."}
              >
                <Input
                  id="waApiKey"
                  name="waApiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={values.hasApiKey ? "•••••••••••••• (saved)" : "Paste your API key"}
                />
              </Field>
            </>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save connection"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Send a test message"
          subtitle={`Goes to your gym number, ${gymPhone}.`}
        />
        <form action={testFormAction} className="mt-4">
          <Button type="submit" variant="secondary" disabled={isTesting}>
            <IconWhatsApp className="size-4" />
            {isTesting ? "Sending…" : "Send test message"}
          </Button>
        </form>
        {testState ? (
          <div className="mt-3">
            <Alert tone={testState.ok ? "good" : "bad"}>
              {testState.ok ? testState.message : testState.errors._form}
            </Alert>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Going live on WhatsApp" subtitle="What Meta requires, in order." />
        <ol className="mt-3 space-y-2.5">
          {[
            "Create a Meta Business account and verify your business.",
            "Add a phone number that is not already on WhatsApp (or migrate one).",
            "Submit your message templates for approval — paste the copy from your Templates page.",
            "Generate a permanent access token from a System User, then paste it above.",
            "Send a test message. Once it arrives, switch provider from Sandbox to Meta.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
              <span className="nums grid size-5 shrink-0 place-items-center rounded-full bg-ink-100 text-[10.5px] font-semibold text-ink-600">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-lg bg-info-50 p-3 text-[12px] leading-relaxed text-info-700">
          <IconCheck className="mb-1 size-3.5" />
          Until this is done, leave the provider on <strong>Sandbox</strong>. Every
          automation still runs and every message is logged, so your data and timing are
          correct from day one — you&apos;re only missing the final delivery hop.
        </div>
      </Card>
    </div>
  );
}
