import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { FilterSelect, Pagination, SearchFilters } from "@/components/data-controls";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconBuilding, IconPlus } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { GYM_STATUS } from "@/lib/constants";
import { fmtDate, relativeDayLabel } from "@/lib/dates";
import { money, num } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

import { GymStatusBadge } from "../page";

export const metadata: Metadata = { title: "Gyms" };

const PAGE_SIZE = 25;

export default async function AdminGymsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { user } = await requirePlatform();

  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const planKey = sp.plan ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.GymWhereInput = {
    ...(status ? { status } : {}),
    ...(planKey ? { saasPlan: { key: planKey } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { city: { contains: q } },
            { ownerName: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };

  const [gyms, total, plans, statusCounts] = await Promise.all([
    db.gym.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        saasPlan: { select: { name: true, key: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { amount: true, billingCycle: true, status: true },
        },
        _count: { select: { members: true, staff: true, messages: true } },
      },
    }),
    db.gym.count({ where }),
    db.saasPlan.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
    Promise.all(
      GYM_STATUS.map(async (s) => ({ status: s, count: await db.gym.count({ where: { status: s } }) })),
    ),
  ]);

  const params = { q, status, plan: planKey };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Gyms"
        subtitle={`${num(total)} ${total === 1 ? "tenant" : "tenants"} in this view`}
        action={
          user.role === "SUPERADMIN" ? (
            <LinkButton href="/admin/gyms/new">
              <IconPlus className="size-4" />
              Provision a gym
            </LinkButton>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/gyms"
          className={
            status === ""
              ? "rounded-full bg-ink-900 px-3 py-1.5 text-[12.5px] font-medium text-white"
              : "rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-600 hover:border-ink-300"
          }
        >
          All
        </Link>
        {statusCounts.map((s) => (
          <Link
            key={s.status}
            href={`/admin/gyms?status=${s.status}`}
            className={
              status === s.status
                ? "rounded-full bg-ink-900 px-3 py-1.5 text-[12.5px] font-medium text-white"
                : "rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-600 hover:border-ink-300"
            }
          >
            {s.status.replace("_", " ").toLowerCase()}
            <span className="nums ml-1.5 opacity-60">{s.count}</span>
          </Link>
        ))}
      </div>

      <Card pad={false}>
        <div className="border-b border-ink-200 p-4">
          <SearchFilters
            action="/admin/gyms"
            q={q}
            placeholder="Gym name, owner, email, city…"
            hidden={{ status: status || undefined }}
          >
            <FilterSelect
              name="plan"
              value={planKey}
              label="All plans"
              options={plans.map((p) => ({ value: p.key, label: p.name }))}
            />
          </SearchFilters>
        </div>

        {gyms.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconBuilding className="size-8" />}
              title={q || status ? "No gyms match" : "No gyms yet"}
              body={q || status ? "Try clearing the filters." : "Provision your first tenant."}
              action={
                user.role === "SUPERADMIN" && !q && !status ? (
                  <LinkButton href="/admin/gyms/new" size="sm">
                    Provision a gym
                  </LinkButton>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Gym</Th>
                  <Th>Owner</Th>
                  <Th>Plan</Th>
                  <Th align="right">MRR</Th>
                  <Th align="right">Members</Th>
                  <Th align="right">Messages</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((g) => {
                  const sub = g.subscriptions[0];
                  const mrr = sub
                    ? sub.billingCycle === "YEARLY"
                      ? Math.round(sub.amount / 12)
                      : sub.amount
                    : 0;
                  return (
                    <Tr key={g.id}>
                      <Td>
                        <Link href={`/admin/gyms/${g.id}`} className="group flex items-center gap-3">
                          <Avatar name={g.name} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-ink-900 group-hover:text-brand-700">
                              {g.name}
                            </span>
                            <span className="block truncate text-[11px] text-ink-500">
                              {g.city ?? "—"} · {g.slug}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <span className="block truncate text-[13px] text-ink-800">
                          {g.ownerName}
                        </span>
                        <span className="block truncate text-[11px] text-ink-500">
                          {displayPhone(g.phone)}
                        </span>
                      </Td>
                      <Td className="text-[12.5px]">{g.saasPlan?.name ?? "—"}</Td>
                      <Td align="right" className="nums text-[13px] font-medium">
                        {g.status === "ACTIVE" || g.status === "PAST_DUE" ? money(mrr) : "—"}
                      </Td>
                      <Td align="right" className="nums text-[13px]">
                        {num(g._count.members)}
                      </Td>
                      <Td align="right" className="nums text-[13px] text-ink-600">
                        {num(g._count.messages)}
                      </Td>
                      <Td>
                        <GymStatusBadge status={g.status} />
                        {g.status === "TRIAL" && g.trialEndsAt ? (
                          <span className="mt-0.5 block text-[10.5px] text-ink-500">
                            ends {relativeDayLabel(g.trialEndsAt, g.timezone)}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-[12px] text-ink-500">{fmtDate(g.createdAt)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              base="/admin/gyms"
              params={params}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
            />
          </>
        )}
      </Card>
    </div>
  );
}
