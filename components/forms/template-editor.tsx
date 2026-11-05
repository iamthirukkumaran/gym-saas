"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Button, Card, CardHeader, Field, Input, Select, cn } from "../ui";
import { IconCheck, IconWhatsApp } from "../icons";
import type { FormState } from "@/lib/validation";

type Variable = { key: string; label: string; example: string; group: string };

/**
 * Template editor with a live WhatsApp preview.
 *
 * Substitution runs in the browser against server-supplied example values, so
 * the owner watches the real message take shape as they type. Placeholder
 * names are validated here *and* on the server — a typo that reaches a member
 * as literal "{{frist_name}}" is the most embarrassing possible bug in a
 * product like this.
 */
export function TemplateEditor({
  action,
  variables,
  values,
  isSystem,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  variables: Variable[];
  values?: {
    key?: string;
    name?: string;
    category?: string;
    body?: string;
    active?: boolean;
  };
  isSystem?: boolean;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [body, setBody] = useState(values?.body ?? "");
  const errors = state && !state.ok ? state.errors : {};

  const known = new Set(variables.map((v) => v.key));
  const examples: Record<string, string> = {};
  for (const v of variables) examples[v.key] = v.example;

  const used = [...body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
  const unknown = [...new Set(used.filter((u) => !known.has(u)))];

  const preview = body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    examples[key] !== undefined ? examples[key] : match,
  );

  function insert(key: string) {
    setBody((b) => `${b}{{${key}}}`);
  }

  const groups = [...new Set(variables.map((v) => v.group))];

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-5">
        {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="good">{state.message}</Alert> : null}

        <Card>
          <CardHeader title="Template details" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Template name" htmlFor="name" error={errors.name} required className="sm:col-span-2">
              <Input id="name" name="name" defaultValue={values?.name} placeholder="Renewal reminder — 7 days before" required />
            </Field>

            <Field
              label="Key"
              htmlFor="key"
              error={errors.key}
              hint={isSystem ? "Built-in key — automations depend on it." : "Lowercase, numbers and underscores."}
              required
            >
              <Input
                id="key"
                name="key"
                defaultValue={values?.key}
                placeholder="renewal_7day"
                readOnly={isSystem}
                className={isSystem ? "bg-ink-50 text-ink-500" : undefined}
                required
              />
            </Field>

            <Field label="Category" htmlFor="category" error={errors.category} required>
              <Select id="category" name="category" defaultValue={values?.category ?? "UTILITY"} required>
                <option value="UTILITY">Utility — reminders, receipts, alerts</option>
                <option value="MARKETING">Marketing — offers, win-backs</option>
                <option value="SERVICE">Service — replies in an open chat</option>
              </Select>
            </Field>

            <label className="flex items-center gap-2.5 sm:col-span-2">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={values?.active ?? true}
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
              />
              <span className="text-[13px] font-medium text-ink-800">
                Active — available to automations and manual sends
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Message"
            subtitle="Keep it short. One clear action. WhatsApp allows 1024 characters."
            action={
              <span
                className={cn(
                  "nums text-[12px]",
                  body.length > 1024 ? "font-semibold text-bad-600" : "text-ink-500",
                )}
              >
                {body.length} / 1024
              </span>
            }
          />

          <div className="mt-4">
            <textarea
              id="body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              required
              placeholder="Hi {{first_name}}! Your {{plan_name}} at {{gym_name}} expires on {{expiry_date}}…"
              className="block w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {errors.body ? (
              <p className="mt-1.5 text-xs font-medium text-bad-600">{errors.body}</p>
            ) : null}
            {unknown.length > 0 ? (
              <div className="mt-2">
                <Alert tone="bad">
                  Unknown placeholder{unknown.length > 1 ? "s" : ""}:{" "}
                  {unknown.map((u) => `{{${u}}}`).join(", ")} — these will be sent as literal
                  text. Use the list on the right.
                </Alert>
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">
            Formatting: <code className="font-mono">*bold*</code>,{" "}
            <code className="font-mono">_italic_</code>,{" "}
            <code className="font-mono">~strike~</code>. WhatsApp renders these natively.
          </p>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={isPending || unknown.length > 0 || body.length > 1024}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
          <Link href={cancelHref} className="text-[13px] font-medium text-ink-500 hover:text-ink-800">
            Cancel
          </Link>
        </div>
      </div>

      {/* ── Preview + variable palette ───────────────────────────────── */}
      <div className="space-y-5">
        <Card className="lg:sticky lg:top-24">
          <CardHeader
            title="Live preview"
            subtitle="Sample values — the real send uses each member's own details."
          />
          <div className="wa-wallpaper mt-4 rounded-xl p-3">
            <div className="flex justify-end pr-2">
              <div className="wa-bubble max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[12.5px] leading-relaxed text-ink-900">
                {preview || (
                  <span className="text-ink-400">Your message will appear here as you type…</span>
                )}
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-500">
                  10:00
                  <IconCheck className="size-3 text-info-500" strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <IconWhatsApp className="size-3.5 text-good-600" />
            Preview length: {preview.length} characters
          </p>
        </Card>

        <Card>
          <CardHeader title="Variables" subtitle="Click to insert at the end of your message." />
          <div className="mt-3 space-y-4">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                  {g}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {variables
                    .filter((v) => v.group === g)
                    .map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insert(v.key)}
                        title={`${v.label} — e.g. ${v.example}`}
                        className={cn(
                          "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                          used.includes(v.key)
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50",
                        )}
                      >
                        {v.key}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </form>
  );
}
