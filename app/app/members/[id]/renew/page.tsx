import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PlanForm } from "@/components/forms/plan-form";
import { Alert, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, toDateInput, todayInZone } from "@/lib/dates";

import { assignPlan } from "../../actions";

export const metadata: Metadata = { title: "Assign plan" };

export default async function RenewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const { gym } = await requireStaff();
  const today = todayInZone(gym.timezone);

  const [member, plans] = await Promise.all([
    db.member.findFirst({
      where: { id, gymId: gym.id },
      include: { memberships: { orderBy: { endDate: "desc" }, take: 1 } },
    }),
    db.membershipPlan.findMany({
      where: { gymId: gym.id, active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!member) notFound();

  const hasHistory = member.memberships.length > 0;
  const current = member.memberships[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={hasHistory ? `Renew ${member.name}` : `Assign a plan to ${member.name}`}
        subtitle={
          current
            ? `Current plan: ${current.planName}, expires ${fmtDate(current.endDate)}`
            : `Member ${member.code} · no plan assigned yet`
        }
      />

      {isNew ? (
        <div className="mb-5">
          <Alert tone="good" title={`${member.name} has been added as ${member.code}`}>
            One last step — put them on a plan so expiry tracking and WhatsApp reminders
            can start.
          </Alert>
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div className="mb-5">
          <Alert tone="warn" title="You have no membership plans yet">
            Create your plans under Settings → Plans, or enter a custom plan below.
          </Alert>
        </div>
      ) : null}

      <PlanForm
        action={assignPlan}
        memberId={member.id}
        memberName={member.name}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          durationDays: p.durationDays,
          price: p.price,
          joiningFee: p.joiningFee,
          description: p.description,
        }))}
        isRenewal={hasHistory}
        currentEndISO={current ? toDateInput(current.endDate) : null}
        todayISO={toDateInput(today)}
        joiningFeeApplies={!hasHistory}
        balanceDue={member.balanceDue}
        cancelHref={`/app/members/${member.id}`}
      />
    </div>
  );
}
