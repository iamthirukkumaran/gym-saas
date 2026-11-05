import type { Metadata } from "next";

import { ProvisionGymForm } from "@/components/forms/admin-forms";
import { Alert, PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { db } from "@/lib/db";

import { createGym } from "../../../actions";

export const metadata: Metadata = { title: "Provision a gym" };

export default async function NewGymPage() {
  await requireSuperadmin();

  const plans = await db.saasPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { key: true, name: true, priceMonthly: true, priceYearly: true, memberLimit: true },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Provision a gym"
        subtitle="Creates a complete, working tenant — plans, templates and automations included."
      />

      {plans.length === 0 ? (
        <Alert tone="bad" title="No subscription plans">
          Create at least one plan under Subscription plans first.
        </Alert>
      ) : (
        <ProvisionGymForm action={createGym} plans={plans} />
      )}
    </div>
  );
}
