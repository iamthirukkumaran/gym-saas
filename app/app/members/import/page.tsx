import type { Metadata } from "next";

import { ImportForm } from "@/components/forms/import-form";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { num } from "@/lib/format";

import { importMembers } from "./actions";

export const metadata: Metadata = { title: "Import members" };

export default async function ImportPage() {
  const { gym } = await requireStaff();

  const existing = await db.member.count({
    where: { gymId: gym.id, status: { not: "CANCELLED" } },
  });
  const limit = gym.saasPlan?.memberLimit ?? -1;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Import your members"
        subtitle="Move off the spreadsheet in one go. Expiry dates come across, so reminders start working immediately."
      />

      {limit !== -1 ? (
        <div className="mb-5">
          <Alert tone="info">
            You have {num(existing)} of {num(limit)} members on your {gym.saasPlan?.name} plan —
            room for {num(Math.max(0, limit - existing))} more.
          </Alert>
        </div>
      ) : null}

      <ImportForm action={importMembers} />

      <Card className="mt-5">
        <CardHeader title="What happens to each row" />
        <ol className="mt-3 space-y-2">
          {[
            "A member record is created with their name, phone, join date and contact details.",
            "If you included an expiry date, Astryx rebuilds their membership window — so they appear in your renewals queue straight away.",
            "If you included an amount paid, a payment is recorded against that membership.",
            "If you included a balance, it shows up in pending dues.",
            "Duplicate phone numbers are skipped, never merged — nobody gets two member records.",
          ].map((t, i) => (
            <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
              <span className="nums grid size-5 shrink-0 place-items-center rounded-full bg-ink-100 text-[10.5px] font-semibold text-ink-600">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
