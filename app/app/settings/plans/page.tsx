import Link from "next/link";
import type { Metadata } from "next";

import { PlanForm } from "@/components/forms/settings-forms";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { durationLabel, money, num } from "@/lib/format";

import { deletePlan, savePlan, togglePlan } from "../actions";

export const metadata: Metadata = { title: "Membership plans" };

export default async function PlansSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: isNew } = await searchParams;
  const { gym } = await requireStaff();

  const plans = await db.membershipPlan.findMany({
    where: { gymId: gym.id },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
    include: { _count: { select: { memberships: true } } },
  });

  const editing = edit ? plans.find((p) => p.id === edit) : undefined;

  return (
    <div className="space-y-5">
      {isNew || editing ? (
        <Card>
          <CardHeader
            title={editing ? `Edit "${editing.name}"` : "New membership plan"}
            subtitle={
              editing
                ? "Changing the price affects future sales only — past memberships keep what they were sold at."
                : undefined
            }
            action={
              <Link
                href="/app/settings/plans"
                className="text-[13px] font-medium text-ink-500 hover:text-ink-800"
              >
                Close
              </Link>
            }
          />
          <div className="mt-4">
            <PlanForm
              action={savePlan.bind(null, editing?.id ?? null)}
              submitLabel={editing ? "Save plan" : "Create plan"}
              values={
                editing
                  ? {
                      name: editing.name,
                      durationDays: editing.durationDays,
                      price: editing.price,
                      joiningFee: editing.joiningFee,
                      description: editing.description ?? undefined,
                      active: editing.active,
                    }
                  : undefined
              }
            />
          </div>
        </Card>
      ) : null}

      <Card pad={false}>
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <CardHeader
            title="Your membership plans"
            subtitle="These are what the front desk picks from when signing someone up."
          />
          <Link
            href="/app/settings/plans?new=1"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
          >
            <IconPlus className="size-3.5" />
            New plan
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              title="No plans yet"
              body="Create your first plan — expiry dates are calculated from its duration."
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Duration</Th>
                <Th align="right">Price</Th>
                <Th align="right">Joining fee</Th>
                <Th align="right">Sold</Th>
                <Th>Status</Th>
                <Th align="right" />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <span className="block text-[13.5px] font-medium text-ink-900">{p.name}</span>
                    {p.description ? (
                      <span className="block max-w-xs truncate text-[11.5px] text-ink-500">
                        {p.description}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="nums text-[13px]">
                    {durationLabel(p.durationDays)}
                    <span className="block text-[11px] text-ink-400">{p.durationDays} days</span>
                  </Td>
                  <Td align="right" className="nums text-[13.5px] font-semibold text-ink-900">
                    {money(p.price)}
                  </Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">
                    {p.joiningFee > 0 ? money(p.joiningFee) : "—"}
                  </Td>
                  <Td align="right" className="nums text-[13px] text-ink-600">
                    {num(p._count.memberships)}
                  </Td>
                  <Td>
                    {p.active ? (
                      <Badge className="bg-good-50 text-good-700 ring-good-500/20" dot="bg-good-500">
                        active
                      </Badge>
                    ) : (
                      <Badge className="bg-ink-100 text-ink-500 ring-ink-400/20">hidden</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/app/settings/plans?edit=${p.id}`}
                        className="rounded-md px-2 py-1 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        Edit
                      </Link>
                      <form action={togglePlan}>
                        <input type="hidden" name="planId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-500 transition-colors hover:bg-ink-100"
                        >
                          {p.active ? "Hide" : "Show"}
                        </button>
                      </form>
                      <form action={deletePlan}>
                        <input type="hidden" name="planId" value={p.id} />
                        <button
                          type="submit"
                          title={
                            p._count.memberships > 0
                              ? "This plan has been sold, so it will be archived instead of deleted"
                              : "Delete this plan"
                          }
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
                        >
                          {p._count.memberships > 0 ? "Archive" : "Delete"}
                        </button>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
