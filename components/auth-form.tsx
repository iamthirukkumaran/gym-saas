"use client";

import { useActionState } from "react";

import { Alert, Button, Field, Input } from "./ui";
import type { FormState } from "@/lib/validation";

/**
 * Shared sign-in form for both the gym and platform logins.
 *
 * `useActionState` keeps field errors inline without a page reload, and
 * `isPending` disables the button so an impatient double-click can't fire two
 * login attempts.
 */
export function AuthForm({
  action,
  submitLabel = "Sign in",
  autoFillEmail,
  autoFillPassword,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  autoFillEmail?: string;
  autoFillPassword?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={formAction} className="space-y-4">
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}

      <Field label="Email address" htmlFor="email" error={errors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@yourgym.in"
          defaultValue={autoFillEmail}
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          defaultValue={autoFillPassword}
          required
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : submitLabel}
      </Button>
    </form>
  );
}
