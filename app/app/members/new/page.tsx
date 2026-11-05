import type { Metadata } from "next";

import { MemberForm } from "@/components/forms/member-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput, todayInZone } from "@/lib/dates";

import { createMember } from "../actions";

export const metadata: Metadata = { title: "Add member" };

export default async function NewMemberPage() {
  const { gym } = await requireStaff();

  const trainers = await db.trainer.findMany({
    where: { gymId: gym.id, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add a member"
        subtitle="Save the basics now — you'll pick their plan on the next screen."
      />
      <MemberForm
        action={createMember}
        trainers={trainers}
        values={{ joinDate: toDateInput(todayInZone(gym.timezone)) }}
        submitLabel="Save and choose plan"
        cancelHref="/app/members"
      />
    </div>
  );
}
