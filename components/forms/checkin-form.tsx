"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, Button, Input } from "../ui";
import { IconCalendarCheck } from "../icons";
import type { FormState } from "@/lib/validation";

/**
 * Check-in box tuned for a queue at the front desk: autofocus, clears itself
 * on success, and re-focuses so the next member can be scanned immediately.
 */
export function CheckInForm({
  action,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errors = state && !state.ok ? state.errors : {};

  useEffect(() => {
    if (state?.ok) {
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
    }
  }, [state]);

  const expired = state?.ok && state.message?.includes("EXPIRED");

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex gap-2">
        <Input
          ref={inputRef}
          name="lookup"
          placeholder="Member ID, phone or name…"
          aria-label="Member ID, phone or name"
          autoFocus
          autoComplete="off"
          className="flex-1 text-base"
        />
        <Button type="submit" size="lg" disabled={isPending} className="shrink-0">
          <IconCalendarCheck className="size-4" />
          {isPending ? "…" : "Check in"}
        </Button>
      </form>

      {errors.lookup ? <Alert tone="bad">{errors.lookup}</Alert> : null}
      {state?.ok && state.message ? (
        <Alert tone={expired ? "warn" : "good"}>{state.message}</Alert>
      ) : null}
    </div>
  );
}
