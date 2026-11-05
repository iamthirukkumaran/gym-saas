"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "../ui";
import { GENDERS, SOURCES, SOURCE_LABELS } from "@/lib/constants";
import type { FormState } from "@/lib/validation";

export type MemberFormValues = {
  name?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  gender?: string | null;
  dob?: string;
  joinDate?: string;
  addressLine?: string;
  city?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: string;
  medicalNotes?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  trainerId?: string | null;
  source?: string | null;
  notes?: string;
  waOptOut?: boolean;
};

/**
 * One form for both "add" and "edit".
 *
 * Grouped into Essentials / Fitness / Emergency because a front desk signing
 * someone up mid-conversation only needs the first group — the rest can be
 * filled in later without blocking the join.
 */
export function MemberForm({
  action,
  trainers,
  values,
  submitLabel = "Save member",
  cancelHref,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  trainers: { id: string; name: string }[];
  values?: MemberFormValues;
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};
  const success = state && state.ok ? state.message : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {success ? <Alert tone="good">{success}</Alert> : null}

      <Card>
        <CardHeader title="Essentials" subtitle="The only fields you need to sign someone up." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={errors.name} required className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={values?.name} placeholder="Rahul Verma" required />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="phone"
            error={errors.phone}
            hint="WhatsApp reminders go to this number."
            required
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={values?.phone}
              placeholder="98765 43210"
              required
            />
          </Field>

          <Field label="Alternate number" htmlFor="altPhone" error={errors.altPhone}>
            <Input id="altPhone" name="altPhone" type="tel" inputMode="tel" defaultValue={values?.altPhone} />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" defaultValue={values?.email} placeholder="optional" />
          </Field>

          <Field label="Joining date" htmlFor="joinDate" error={errors.joinDate} required>
            <Input id="joinDate" name="joinDate" type="date" defaultValue={values?.joinDate} required />
          </Field>

          <Field label="Date of birth" htmlFor="dob" error={errors.dob} hint="Used for birthday wishes.">
            <Input id="dob" name="dob" type="date" defaultValue={values?.dob} />
          </Field>

          <Field label="Gender" htmlFor="gender" error={errors.gender}>
            <Select id="gender" name="gender" defaultValue={values?.gender ?? ""}>
              <option value="">Prefer not to say</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0) + g.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="How did they find you?" htmlFor="source" error={errors.source}>
            <Select id="source" name="source" defaultValue={values?.source ?? ""}>
              <option value="">Not recorded</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assigned trainer" htmlFor="trainerId" error={errors.trainerId}>
            <Select id="trainerId" name="trainerId" defaultValue={values?.trainerId ?? ""}>
              <option value="">No trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="City" htmlFor="city" error={errors.city}>
            <Input id="city" name="city" defaultValue={values?.city} />
          </Field>

          <Field label="Address" htmlFor="addressLine" error={errors.addressLine} className="sm:col-span-2">
            <Input id="addressLine" name="addressLine" defaultValue={values?.addressLine} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Fitness profile"
          subtitle="Optional. Helps trainers and makes progress conversations concrete."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Height (cm)" htmlFor="heightCm" error={errors.heightCm}>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              inputMode="numeric"
              defaultValue={values?.heightCm ?? ""}
              placeholder="172"
            />
          </Field>
          <Field label="Weight (kg)" htmlFor="weightKg" error={errors.weightKg}>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={values?.weightKg ?? ""}
              placeholder="74.5"
            />
          </Field>
          <Field label="Primary goal" htmlFor="goal" error={errors.goal}>
            <Input id="goal" name="goal" defaultValue={values?.goal} placeholder="Weight loss" />
          </Field>
          <Field
            label="Medical notes"
            htmlFor="medicalNotes"
            error={errors.medicalNotes}
            hint="Injuries, conditions, medication the trainer should know about."
            className="sm:col-span-3"
          >
            <Textarea id="medicalNotes" name="medicalNotes" defaultValue={values?.medicalNotes} rows={2} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Emergency contact & preferences" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" htmlFor="emergencyName" error={errors.emergencyName}>
            <Input id="emergencyName" name="emergencyName" defaultValue={values?.emergencyName} />
          </Field>
          <Field label="Contact number" htmlFor="emergencyPhone" error={errors.emergencyPhone}>
            <Input
              id="emergencyPhone"
              name="emergencyPhone"
              type="tel"
              inputMode="tel"
              defaultValue={values?.emergencyPhone}
            />
          </Field>
          <Field label="Internal notes" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={values?.notes}
              rows={2}
              placeholder="Visible to staff only — never sent to the member."
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="waOptOut"
              value="true"
              defaultChecked={values?.waOptOut}
              label="Do not send WhatsApp messages to this member"
              hint="Astryx will skip them in every automation and broadcast. Use this the moment someone asks to stop."
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className="text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
