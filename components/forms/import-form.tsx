"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Badge, Button, Card, CardHeader, Table, Td, Th, Tr, cn } from "../ui";
import { IconCheck, IconUpload } from "../icons";
import { money, num, plural } from "@/lib/format";
import type { ImportResult } from "@/app/app/members/import/actions";

const SAMPLE = `Name,Mobile,Joining Date,Valid Till,Package,Amount Paid,Balance
Rahul Verma,9876543210,12/03/2026,28/11/2026,3 Months,4500,0
Priya Nair,9876543211,05/01/2026,04/07/2026,6 Months,7000,0
Imran Khan,9876543212,05/04/2026,05/05/2026,1 Month,1500,500`;

/**
 * Two-phase import: always dry-run first, then commit.
 *
 * Showing the parsed result before writing is what makes an owner willing to
 * paste 400 rows of their only member list into a tool they met ten minutes
 * ago.
 */
export function ImportForm({
  action,
}: {
  action: (prev: ImportResult | null, formData: FormData) => Promise<ImportResult>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [csv, setCsv] = useState("");

  const valid = state?.rows.filter((r) => !r.problem) ?? [];
  const problems = state?.rows.filter((r) => r.problem) ?? [];
  const committed = state?.ok && !state.dryRun;

  if (committed) {
    return (
      <Card>
        <div className="py-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-good-100">
            <IconCheck className="size-6 text-good-700" strokeWidth={2.5} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink-900">
            Imported {num(state.imported)} {plural(state.imported, "member")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-600">
            {state.skipped > 0
              ? `${num(state.skipped)} ${plural(state.skipped, "row")} were skipped — duplicates or missing details.`
              : "Every row imported cleanly."}{" "}
            Expiry dates are live, so renewal reminders will start going out on your
            automation schedule.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/app/members"
              className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              View members
            </Link>
            <Link
              href="/app/renewals"
              className="inline-flex h-10 items-center rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
              See who&apos;s expiring
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <Card>
          <CardHeader
            title="1 · Paste or upload your member list"
            subtitle="Copy straight out of Excel or Google Sheets — including the header row."
          />

          <div className="mt-4 space-y-3">
            <textarea
              name="csv"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              placeholder={SAMPLE}
              className="block w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCsv(SAMPLE)}
                className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
              >
                Fill with sample data
              </button>
              <span className="text-ink-300">·</span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                <IconUpload className="size-3.5" />
                Choose a CSV file instead
                <input type="file" name="file" accept=".csv,.txt,.tsv,text/csv" className="hidden" />
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-ink-50 p-3.5">
            <p className="text-[12px] font-semibold text-ink-700">
              Astryx recognises these columns automatically
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">
              <strong>Required:</strong> Name, and Phone (or Mobile / Contact / WhatsApp).
              <br />
              <strong>Recommended:</strong> Joining Date, Valid Till (or Expiry / End Date),
              Package (or Plan), Amount Paid, Balance.
              <br />
              <strong>Optional:</strong> Email, City, Remarks.
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-500">
              Dates can be dd/mm/yyyy, yyyy-mm-dd or &ldquo;12 Mar 2026&rdquo;. Amounts can
              include ₹ and commas.
            </p>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={isPending || !csv.trim()}>
            {isPending ? "Checking…" : "Check my data"}
          </Button>
          <span className="text-[12.5px] text-ink-500">
            Nothing is saved yet — you&apos;ll see exactly what will happen first.
          </span>
        </div>
      </form>

      {state?.error ? <Alert tone="bad" title="Couldn't read that">{state.error}</Alert> : null}

      {state?.ok && state.dryRun ? (
        <Card pad={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="2 · Review before importing"
              subtitle={`${num(valid.length)} ${plural(valid.length, "row")} ready${problems.length > 0 ? `, ${num(problems.length)} will be skipped` : ""}.`}
              action={
                <div className="flex gap-2">
                  <Badge className="bg-good-50 text-good-700 ring-good-500/20">
                    {num(valid.length)} ready
                  </Badge>
                  {problems.length > 0 ? (
                    <Badge className="bg-warn-50 text-warn-700 ring-warn-500/25">
                      {num(problems.length)} skipped
                    </Badge>
                  ) : null}
                </div>
              }
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(state.mapping).map(([field, idx]) => (
                <span
                  key={field}
                  className="rounded-md border border-good-500/25 bg-good-50 px-2 py-0.5 text-[11px] text-good-700"
                >
                  {field} ← &ldquo;{state.headers[idx]}&rdquo;
                </span>
              ))}
              {state.headers
                .map((h, i) => ({ h, i }))
                .filter(({ i }) => !Object.values(state.mapping).includes(i))
                .map(({ h, i }) => (
                  <span
                    key={`un-${i}`}
                    className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] text-ink-500"
                  >
                    ignored: &ldquo;{h}&rdquo;
                  </span>
                ))}
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Row</Th>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Plan</Th>
                <Th>Expires</Th>
                <Th align="right">Paid</Th>
                <Th align="right">Due</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {state.rows.slice(0, 50).map((r) => (
                <Tr key={r.line} className={r.problem ? "bg-warn-50/40" : undefined}>
                  <Td className="nums text-[12px] text-ink-400">{r.line}</Td>
                  <Td className="text-[13px] font-medium text-ink-900">{r.name || "—"}</Td>
                  <Td className="nums text-[12.5px]">{r.phone || "—"}</Td>
                  <Td className="text-[12.5px]">{r.planName}</Td>
                  <Td className="text-[12.5px]">
                    {r.expiryDate ? r.expiryDate.toISOString().slice(0, 10) : "—"}
                  </Td>
                  <Td align="right" className="nums text-[12.5px]">
                    {r.amount > 0 ? money(r.amount) : "—"}
                  </Td>
                  <Td align="right" className="nums text-[12.5px]">
                    {r.balance > 0 ? money(r.balance) : "—"}
                  </Td>
                  <Td>
                    {r.problem ? (
                      <span className="text-[11.5px] font-medium text-warn-700">{r.problem}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-good-700">
                        <IconCheck className="size-3" strokeWidth={3} />
                        will import
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          {state.rows.length > 50 ? (
            <p className="px-5 py-2 text-[12px] text-ink-500">
              Showing the first 50 of {num(state.rows.length)} rows. All of them will be
              processed.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-ink-200 p-5">
            <form action={formAction}>
              <input type="hidden" name="csv" value={csv} />
              <input type="hidden" name="commit" value="yes" />
              <Button type="submit" size="lg" variant="good" disabled={isPending || valid.length === 0}>
                {isPending
                  ? "Importing…"
                  : `Import ${num(valid.length)} ${plural(valid.length, "member")}`}
              </Button>
            </form>
            <span className="text-[12.5px] text-ink-500">
              Skipped rows are left untouched — fix them in your sheet and import again.
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
