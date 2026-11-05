import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MemberForm } from "@/components/forms/member-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";

import { updateMember } from "../../actions";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { gym } = await requireStaff();

  const [member, trainers] = await Promise.all([
    db.member.findFirst({ where: { id, gymId: gym.id } }),
    db.trainer.findMany({
      where: { gymId: gym.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!member) notFound();

  // Bind the member id server-side; the form never gets to choose which
  // record it updates.
  const action = updateMember.bind(null, member.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Edit ${member.name}`}
        subtitle={`Member ${member.code} · joined ${toDateInput(member.joinDate)}`}
      />
      <MemberForm
        action={action}
        trainers={trainers}
        submitLabel="Save changes"
        cancelHref={`/app/members/${member.id}`}
        values={{
          name: member.name,
          phone: member.phone,
          altPhone: member.altPhone ?? undefined,
          email: member.email ?? undefined,
          gender: member.gender,
          dob: toDateInput(member.dob),
          joinDate: toDateInput(member.joinDate),
          addressLine: member.addressLine ?? undefined,
          city: member.city ?? undefined,
          heightCm: member.heightCm,
          weightKg: member.weightKg,
          goal: member.goal ?? undefined,
          medicalNotes: member.medicalNotes ?? undefined,
          emergencyName: member.emergencyName ?? undefined,
          emergencyPhone: member.emergencyPhone ?? undefined,
          trainerId: member.trainerId,
          source: member.source,
          notes: member.notes ?? undefined,
          waOptOut: member.waOptOut,
        }}
      />
    </div>
  );
}
