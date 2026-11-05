"use client";

import { useActionState } from "react";

import { Alert, Button, Card, CardHeader, Field, Select, cn } from "../ui";
import { IconPlay, IconZap } from "../icons";
import { hourLabel } from "@/lib/dates";
import type { FormState } from "@/lib/validation";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Master switch, send window and quiet hours. */
export function AutomationSettings({
  action,
  enabled,
  sendHour,
  quietStart,
  quietEnd,
  timezone,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  enabled: boolean;
  sendHour: number;
  quietStart: number;
  quietEnd: number;
  timezone: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <Card>
      <CardHeader
        title="Delivery settings"
        subtitle={`All times are ${timezone.replace("_", " ")}.`}
      />

      <form action={formAction} className="mt-4 space-y-4">
        {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

        {/* Master switch, styled as a real switch so its state is unmistakable */}
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
            enabled ? "border-good-500/30 bg-good-50" : "border-warn-500/30 bg-warn-50",
          )}
        >
          <input
            type="checkbox"
            name="autoRemindersEnabled"
            value="true"
            defaultChecked={enabled}
            className="mt-0.5 size-4 rounded border-ink-300 text-good-600 focus:ring-good-500/30"
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink-900">
              Automated WhatsApp reminders
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-600">
              {enabled
                ? "On. Astryx messages your members on the schedule below without you doing anything."
                : "Off. Nothing is being sent — members will lapse without hearing from you."}
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Send reminders at"
            htmlFor="reminderSendHour"
            error={errors.reminderSendHour}
            hint="Mid-morning gets the best response."
          >
            <Select id="reminderSendHour" name="reminderSendHour" defaultValue={String(sendHour)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Quiet hours start" htmlFor="quietHoursStart" error={errors.quietHoursStart}>
            <Select id="quietHoursStart" name="quietHoursStart" defaultValue={String(quietStart)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Quiet hours end"
            htmlFor="quietHoursEnd"
            error={errors.quietHoursEnd}
            hint="Nothing sends inside this window."
          >
            <Select id="quietHoursEnd" name="quietHoursEnd" defaultValue={String(quietEnd)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}

/** "Run now" — proves the automation works without waiting for the cron. */
export function RunEngineButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction, isPending] = useActionState(
    async () => action(),
    null as FormState | null,
  );

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <Button type="submit" variant="secondary" disabled={isPending}>
          <IconPlay className="size-3.5" />
          {isPending ? "Running…" : "Run automations now"}
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

/** Add / edit one automation rule. */
export function RuleForm({
  action,
  templates,
  values,
  triggers,
  triggerLabels,
  triggerHelp,
  submitLabel,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  templates: { key: string; name: string }[];
  values?: {
    name?: string;
    trigger?: string;
    offsetDays?: number;
    templateKey?: string;
    enabled?: boolean;
    sendHour?: number | null;
  };
  triggers: readonly string[];
  triggerLabels: Record<string, string>;
  triggerHelp: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-4">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name this automation" htmlFor="name" error={errors.name} required className="sm:col-span-2">
          <input
            id="name"
            name="name"
            defaultValue={values?.name}
            placeholder="Renewal reminder — 7 days before"
            required
            className="block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </Field>

        <Field label="When should it fire?" htmlFor="trigger" error={errors.trigger} required>
          <Select id="trigger" name="trigger" defaultValue={values?.trigger ?? "BEFORE_EXPIRY"} required>
            {triggers.map((t) => (
              <option key={t} value={t}>
                {triggerLabels[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Days offset"
          htmlFor="offsetDays"
          error={errors.offsetDays}
          hint="Days before / after the trigger. Use 0 for same-day."
          required
        >
          <input
            id="offsetDays"
            name="offsetDays"
            type="number"
            min="0"
            max="365"
            defaultValue={values?.offsetDays ?? 7}
            required
            className="block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </Field>

        <Field label="Message template" htmlFor="templateKey" error={errors.templateKey} required>
          <Select id="templateKey" name="templateKey" defaultValue={values?.templateKey ?? ""} required>
            <option value="">Choose a template…</option>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Send hour override"
          htmlFor="sendHour"
          error={errors.sendHour}
          hint="Leave blank to use the gym default."
        >
          <Select id="sendHour" name="sendHour" defaultValue={values?.sendHour != null ? String(values.sendHour) : ""}>
            <option value="">Use default</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="enabled"
          value="true"
          defaultChecked={values?.enabled ?? true}
          className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
        />
        <span className="text-[13px] font-medium text-ink-800">Enabled</span>
      </label>

      <div className="rounded-lg bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-600">
        <IconZap className="mb-1 size-3.5 text-brand-500" />
        {Object.entries(triggerHelp).map(([k, v]) => (
          <p key={k} className="mt-0.5">
            <strong className="font-semibold text-ink-700">{triggerLabels[k]}:</strong> {v}
          </p>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
