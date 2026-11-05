"use client";

import { useActionState, useState } from "react";

import { Alert, Button, Field, Select } from "../ui";
import { IconWhatsApp } from "../icons";
import type { FormState } from "@/lib/validation";

/**
 * Manual send, with a live preview of the exact rendered text.
 *
 * The preview is computed on the server for each template and passed in as a
 * map — so the owner reads the real message (member's name, their expiry
 * date, their link) before it leaves, not a generic sample.
 */
export function SendMessagePanel({
  action,
  memberId,
  templates,
  previews,
  optedOut,
}: {
  action: (prev: FormState | null, formData: FormData) => Promise<FormState>;
  memberId: string;
  templates: { key: string; name: string; category: string }[];
  previews: Record<string, string>;
  optedOut: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [selected, setSelected] = useState(templates[0]?.key ?? "");
  const errors = state && !state.ok ? state.errors : {};
  const success = state && state.ok ? state.message : undefined;

  if (optedOut) {
    return (
      <Alert tone="warn" title="Messaging disabled for this member">
        They&apos;ve opted out of WhatsApp. Turn it back on from their profile if they
        ask to resume.
      </Alert>
    );
  }

  if (templates.length === 0) {
    return <Alert tone="info">No active templates. Create one under Templates first.</Alert>;
  }

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="memberId" value={memberId} />
      {errors._form ? <Alert tone="bad">{errors._form}</Alert> : null}
      {success ? <Alert tone="good">{success}</Alert> : null}

      <Field label="Message template" htmlFor="templateKey" error={errors.templateKey}>
        <Select
          id="templateKey"
          name="templateKey"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      {/* WhatsApp-accurate preview: what the member will actually see */}
      <div className="wa-wallpaper rounded-lg p-3">
        <div className="flex justify-end">
          <div className="wa-bubble max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[12.5px] leading-relaxed text-ink-900">
            {previews[selected] ?? "—"}
          </div>
        </div>
      </div>

      <Button type="submit" variant="good" disabled={isPending} className="w-full">
        <IconWhatsApp className="size-4" />
        {isPending ? "Sending…" : "Send on WhatsApp now"}
      </Button>
    </form>
  );
}
