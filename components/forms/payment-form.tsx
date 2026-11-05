"use client";

import { useActionState } from "react";

import { Alert, Button, Field, Input, Select, Textarea } from "../ui";
import { MODE_LABELS, PAYMENT_MODES } from "@/lib/constants";
import { toRupees } from "@/lib/format";
import type { FormState } from "@/lib/validation";

/**
 * Collect-a-payment form.
 *
 * Pre-fills the amount with the outstanding balance, because the overwhelming
 * majority of front-desk payments clear the full due — making the common case
 * a two-tap operation.
 */
export function PaymentForm({
  action,
  memberId,
  balanceDue,
  memberships,
  todayInput,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  memberId: string;
  balanceDue: number;
  memberships: { id: string; planName: string; payable: number }[];
  todayInput: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};
  const success = state && state.ok ? state.message : undefined;

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="memberId" value={memberId} />
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {success ? <Alert tone="good">{success}</Alert> : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Amount received (₹)" htmlFor="amount" error={errors.amount} required>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            defaultValue={balanceDue > 0 ? String(toRupees(balanceDue)) : ""}
            placeholder="1500"
            required
          />
        </Field>

        <Field label="Payment mode" htmlFor="mode" error={errors.mode} required>
          <Select id="mode" name="mode" defaultValue="UPI" required>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date received" htmlFor="paidAt" error={errors.paidAt} required>
          <Input id="paidAt" name="paidAt" type="date" defaultValue={todayInput} required />
        </Field>

        <Field
          label="Reference"
          htmlFor="reference"
          error={errors.reference}
          hint="UPI ref / cheque no."
        >
          <Input id="reference" name="reference" placeholder="optional" />
        </Field>

        {memberships.length > 0 ? (
          <Field
            label="Apply to membership"
            htmlFor="membershipId"
            error={errors.membershipId}
            className="sm:col-span-2"
          >
            <Select id="membershipId" name="membershipId" defaultValue={memberships[0]?.id ?? ""}>
              <option value="">Not linked to a specific plan</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.planName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Notes" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} placeholder="optional" />
        </Field>
      </div>

      <Button type="submit" variant="good" disabled={isPending}>
        {isPending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
