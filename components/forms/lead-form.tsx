"use client";

import { useActionState } from "react";

import { Alert, Button, Field, Input, Select, Textarea } from "../ui";
import { LEAD_STATUS, SOURCES, SOURCE_LABELS } from "@/lib/constants";
import type { FormState } from "@/lib/validation";

/** Compact walk-in capture form — designed to be filled in under 20 seconds. */
export function LeadForm({
  action,
  todayISO,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  todayISO: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-3.5">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Name" htmlFor="lead-name" error={errors.name} required className="sm:col-span-2">
          <Input id="lead-name" name="name" placeholder="Walk-in name" required />
        </Field>

        <Field label="Mobile" htmlFor="lead-phone" error={errors.phone} required>
          <Input id="lead-phone" name="phone" type="tel" inputMode="tel" placeholder="98765 43210" required />
        </Field>

        <Field label="Interested in" htmlFor="lead-interest" error={errors.interest}>
          <Input id="lead-interest" name="interest" placeholder="3 Months / PT" />
        </Field>

        <Field label="Source" htmlFor="lead-source" error={errors.source}>
          <Select id="lead-source" name="source" defaultValue="WALKIN">
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Follow up on"
          htmlFor="lead-followUpAt"
          error={errors.followUpAt}
          hint="Appears in your follow-up queue."
        >
          <Input id="lead-followUpAt" name="followUpAt" type="date" defaultValue={todayISO} />
        </Field>

        <Field label="Notes" htmlFor="lead-notes" error={errors.notes} className="sm:col-span-2">
          <Textarea id="lead-notes" name="notes" rows={2} placeholder="What did they ask about?" />
        </Field>
      </div>

      <input type="hidden" name="status" value="NEW" />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Add enquiry"}
      </Button>
    </form>
  );
}
