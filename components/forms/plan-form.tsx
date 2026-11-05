"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Alert, Button, Card, CardHeader, Checkbox, Divider, Field, Input, Row, Select, cn } from "../ui";
import { MODE_LABELS, PAYMENT_MODES } from "@/lib/constants";
import type { FormState } from "@/lib/validation";

export type PlanOption = {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  joiningFee: number;
  description: string | null;
};

/**
 * Plan assignment / renewal.
 *
 * Computes the resulting expiry date and amount payable live, in the browser,
 * mirroring the server's `assignMembership` rules — including the one that
 * matters most to an owner's trust: renewing early stacks onto the remaining
 * days instead of throwing them away.
 */
export function PlanForm({
  action,
  memberId,
  memberName,
  plans,
  isRenewal,
  currentEndISO,
  todayISO,
  joiningFeeApplies,
  balanceDue,
  cancelHref,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  memberId: string;
  memberName: string;
  plans: PlanOption[];
  isRenewal: boolean;
  /** ISO yyyy-MM-dd of the member's current expiry, if any. */
  currentEndISO: string | null;
  todayISO: string;
  joiningFeeApplies: boolean;
  balanceDue: number;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [custom, setCustom] = useState(plans.length === 0);
  const [customDays, setCustomDays] = useState("30");
  const [customPrice, setCustomPrice] = useState("");
  const [startDate, setStartDate] = useState(todayISO);
  const [discount, setDiscount] = useState("0");
  const [payNow, setPayNow] = useState("");

  const selected = plans.find((p) => p.id === planId);
  const days = custom ? Number(customDays) || 0 : (selected?.durationDays ?? 0);
  const price = custom ? Math.round((Number(customPrice) || 0) * 100) : (selected?.price ?? 0);
  const fee = custom || !joiningFeeApplies ? 0 : (selected?.joiningFee ?? 0);
  const disc = Math.round((Number(discount) || 0) * 100);
  const payable = Math.max(0, price - disc + fee);

  // Mirrors lib/members.assignMembership: an early renewal starts the day
  // after the current plan ends, so paid-for days are never lost.
  const effectiveStart = useMemo(() => {
    if (isRenewal && currentEndISO && currentEndISO >= todayISO) {
      const d = new Date(`${currentEndISO}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    return startDate;
  }, [isRenewal, currentEndISO, todayISO, startDate]);

  const newEnd = useMemo(() => {
    if (!days) return null;
    const d = new Date(`${effectiveStart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() + days - 1);
    return d;
  }, [effectiveStart, days]);

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
      : "—";
  const rupees = (paise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);

  const stacked = isRenewal && currentEndISO !== null && currentEndISO >= todayISO;

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="isRenewal" value={isRenewal ? "true" : ""} />
      {custom ? null : <input type="hidden" name="planId" value={planId} />}

      <div className="space-y-5">
        {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}

        <Card>
          <CardHeader
            title="Choose a plan"
            subtitle={`For ${memberName}`}
            action={
              plans.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCustom((v) => !v)}
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  {custom ? "Use a saved plan" : "Custom plan"}
                </button>
              ) : null
            }
          />

          {custom ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Plan name" htmlFor="customName" error={errors.customName} required>
                <Input id="customName" name="customName" placeholder="2 Month Special" required />
              </Field>
              <Field label="Duration (days)" htmlFor="customDurationDays" error={errors.customDurationDays} required>
                <Input
                  id="customDurationDays"
                  name="customDurationDays"
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  required
                />
              </Field>
              <Field label="Price (₹)" htmlFor="customPrice" error={errors.customPrice} required>
                <Input
                  id="customPrice"
                  name="customPrice"
                  type="number"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="2500"
                  required
                />
              </Field>
            </div>
          ) : (
            <>
              {errors.planId ? (
                <p className="mt-3 text-xs font-medium text-bad-600">{errors.planId}</p>
              ) : null}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    aria-pressed={planId === p.id}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      planId === p.id
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                        : "border-ink-200 bg-white hover:border-ink-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14px] font-semibold text-ink-900">{p.name}</span>
                      <span className="nums shrink-0 text-[14px] font-semibold text-ink-900">
                        {rupees(p.price)}
                      </span>
                    </div>
                    <p className="nums mt-0.5 text-[12px] text-ink-500">
                      {p.durationDays} days
                      {p.joiningFee > 0 && joiningFeeApplies
                        ? ` · +${rupees(p.joiningFee)} joining fee`
                        : ""}
                    </p>
                    {p.description ? (
                      <p className="mt-1.5 text-[11.5px] leading-snug text-ink-500">{p.description}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Dates and discount" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Start date"
              htmlFor="startDate"
              error={errors.startDate}
              hint={stacked ? "Overridden — see the summary." : "Leave as today for an immediate start."}
              required
            >
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={stacked}
                required
              />
              {stacked ? <input type="hidden" name="startDate" value={effectiveStart} /> : null}
            </Field>

            <Field label="Discount (₹)" htmlFor="discount" error={errors.discount}>
              <Input
                id="discount"
                name="discount"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Checkbox
                name="autoRenew"
                value="true"
                label="Mark as auto-renewing"
                hint="Flags the member for automatic renewal so your reports can tell them apart. Collection is still manual."
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Collect payment now"
            subtitle="Optional — skip it and the amount shows up in pending dues."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Amount received (₹)" htmlFor="payNow" error={errors.payNow}>
              <Input
                id="payNow"
                name="payNow"
                type="number"
                min="0"
                value={payNow}
                onChange={(e) => setPayNow(e.target.value)}
                placeholder={String(Math.round(payable / 100))}
              />
            </Field>
            <Field label="Payment mode" htmlFor="payMode" error={errors.payMode}>
              <Select id="payMode" name="payMode" defaultValue="UPI">
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="button"
              onClick={() => setPayNow(String(Math.round(payable / 100)))}
              className="justify-self-start text-[13px] font-medium text-brand-600 hover:text-brand-700"
            >
              Fill full amount ({rupees(payable)})
            </button>
          </div>
        </Card>
      </div>

      {/* ── Live summary ─────────────────────────────────────────────── */}
      <div>
        <Card className="lg:sticky lg:top-24">
          <CardHeader title="Summary" subtitle="Updates as you choose." />

          <dl className="mt-4">
            <Row label="Plan" value={custom ? "Custom plan" : (selected?.name ?? "—")} />
            <Row label="Duration" value={days ? `${days} days` : "—"} />
            <Row label="Starts" value={fmt(new Date(`${effectiveStart}T00:00:00Z`))} />
            <Row
              label="New expiry"
              value={<span className="font-semibold text-brand-700">{fmt(newEnd)}</span>}
            />
          </dl>

          {stacked ? (
            <div className="mt-3 rounded-lg bg-good-50 p-3 text-[12px] leading-relaxed text-good-700">
              This member still has days left. The new plan starts the day after their
              current one ends — <strong>no paid days are lost</strong>.
            </div>
          ) : null}

          <Divider className="my-4" />

          <dl>
            <Row label="Plan price" value={rupees(price)} />
            {fee > 0 ? <Row label="Joining fee" value={rupees(fee)} /> : null}
            {disc > 0 ? (
              <Row label="Discount" value={<span className="text-good-600">− {rupees(disc)}</span>} />
            ) : null}
            <Divider className="my-2" />
            <Row
              label="Total payable"
              value={<span className="text-base font-semibold text-ink-900">{rupees(payable)}</span>}
            />
            {balanceDue > 0 ? (
              <Row
                label="Earlier dues"
                value={<span className="text-warn-700">{rupees(balanceDue)}</span>}
              />
            ) : null}
            {Number(payNow) > 0 ? (
              <Row
                label="Paying now"
                value={<span className="text-good-700">{rupees(Math.round(Number(payNow) * 100))}</span>}
              />
            ) : null}
          </dl>

          <div className="mt-5 space-y-2.5">
            <Button type="submit" size="lg" className="w-full" disabled={isPending || (!custom && !planId)}>
              {isPending ? "Saving…" : isRenewal ? "Confirm renewal" : "Activate membership"}
            </Button>
            <Link
              href={cancelHref}
              className="block text-center text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800"
            >
              Cancel
            </Link>
          </div>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-500">
            Saving this schedules the renewal reminders automatically — 7, 3 and 1 days
            before the new expiry date.
          </p>
        </Card>
      </div>
    </form>
  );
}
