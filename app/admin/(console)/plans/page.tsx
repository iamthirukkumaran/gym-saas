import Link from "next/link";
import type { Metadata } from "next";

import { SaasPlanForm } from "@/components/forms/admin-forms";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, num } from "@/lib/format";

import { saveSaasPlan, toggleSaasPlan } from "../../actions";

export const metadata: Metadata = { title: "Subscription plans" };

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: isNew } = await searchParams;
  const { user } = await requirePlatform();
  const isSuper = user.role === "SUPERADMIN";

  const plans = await db.saasPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { gyms: true, subscriptions: true } } },
  });

  const editing = edit ? plans.find((p) => p.id === edit) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Subscription plans"
        subtitle="What Astryx charges gyms. Changes apply to new signups; existing tenants keep their agreed price until you move them."
        action={
          isSuper ? (
            <Link
              href="/admin/plans?new=1"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <IconPlus className="size-4" />
              New plan
            </Link>
          ) : null
        }
      />

      {!isSuper ? (
        <div className="mb-5">
          <Alert tone="info">Support accounts can view plans but not change them.</Alert>
        </div>
      ) : null}

      {isSuper && (isNew || editing) ? (
        <Card className="mb-5">
          <CardHeader
            title={editing ? `Edit ${editing.name}` : "New subscription plan"}
            action={
              <Link href="/admin/plans" className="text-[13px] font-medium text-ink-500 hover:text-ink-800">
                Close
              </Link>
            }
          />
          <div className="mt-4">
            <SaasPlanForm
              action={saveSaasPlan.bind(null, editing?.id ?? null)}
              submitLabel={editing ? "Save plan" : "Create plan"}
              values={
                editing
                  ? {
                      key: editing.key,
                      name: editing.name,
                      tagline: editing.tagline ?? undefined,
                      priceMonthly: editing.priceMonthly,
                      priceYearly: editing.priceYearly,
                      memberLimit: editing.memberLimit,
                      staffLimit: editing.staffLimit,
                      waMessageLimit: editing.waMessageLimit,
                      features: JSON.parse(editing.featuresJson) as string[],
                      active: editing.active,
                    }
                  : undefined
              }
            />
          </div>
        </Card>
      ) : null}

      <Card pad={false}>
        {plans.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No plans configured" body="Create at least one before provisioning gyms." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th align="right">Monthly</Th>
                <Th align="right">Yearly</Th>
                <Th align="right">Members</Th>
                <Th align="right">Messages</Th>
                <Th align="right">Tenants</Th>
                <Th>Status</Th>
                {isSuper ? <Th align="right" /> : null}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <span className="block text-[13.5px] font-medium text-ink-900">{p.name}</span>
                    <span className="block text-[11px] text-ink-500">{p.tagline ?? "—"}</span>
                    <Pill className="mt-1">{p.key}</Pill>
                  </Td>
                  <Td align="right" className="nums text-[13px] font-semibold">
                    {money(p.priceMonthly)}
                  </Td>
                  <Td align="right" className="nums text-[13px]">
                    {money(p.priceYearly)}
                  </Td>
                  <Td align="right" className="nums text-[13px]">
                    {p.memberLimit === -1 ? "∞" : num(p.memberLimit)}
                  </Td>
                  <Td align="right" className="nums text-[13px]">
                    {p.waMessageLimit === -1 ? "∞" : num(p.waMessageLimit)}
                  </Td>
                  <Td align="right" className="nums text-[13px] font-medium">
                    {num(p._count.gyms)}
                  </Td>
                  <Td>
                    {p.active ? (
                      <Badge className="bg-good-50 text-good-700 ring-good-500/20" dot="bg-good-500">
                        live
                      </Badge>
                    ) : (
                      <Badge className="bg-ink-100 text-ink-500 ring-ink-400/20">hidden</Badge>
                    )}
                  </Td>
                  {isSuper ? (
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/plans?edit=${p.id}`}
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          Edit
                        </Link>
                        <form action={toggleSaasPlan}>
                          <input type="hidden" name="planId" value={p.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-500 transition-colors hover:bg-ink-100"
                          >
                            {p.active ? "Hide" : "Show"}
                          </button>
                        </form>
                      </div>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
