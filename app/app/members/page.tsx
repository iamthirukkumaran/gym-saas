import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import {
  FilterSelect,
  Pagination,
  SearchFilters,
  buildUrl,
} from "@/components/data-controls";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  PageHeader,
  Alert,
} from "@/components/ui";
import { IconDownload, IconPlus, IconUpload, IconUsers, IconWhatsApp } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { DERIVED_STATUS, STATUS_LABELS, type DerivedStatus } from "@/lib/constants";
import { fmtDate, relativeDayLabel } from "@/lib/dates";
import { money, num } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";
import { daysRemaining, deriveStatus, STATUS_DOTS, STATUS_STYLES } from "@/lib/status";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 25;

const SORTS: Record<string, Prisma.MemberOrderByWithRelationInput> = {
  recent: { createdAt: "desc" },
  name: { name: "asc" },
  expiry: { expiryDate: "asc" },
  dues: { balanceDue: "desc" },
  visit: { lastCheckInAt: "desc" },
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;

  const q = sp.q?.trim() ?? "";
  const status = (sp.status ?? "") as DerivedStatus | "";
  const planName = sp.plan ?? "";
  const trainerId = sp.trainer ?? "";
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "recent";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // Reuse the shared status predicates so this list can never disagree with
  // the dashboard counts.
  const { statusWhere } = await import("@/lib/status");

  const where: Prisma.MemberWhereInput = {
    gymId: gym.id,
    ...(status ? statusWhere(status, tz) : { status: { not: "CANCELLED" } }),
    ...(planName ? { activePlanName: planName } : {}),
    ...(trainerId ? { trainerId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { code: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const [members, total, plans, trainers, statusCounts] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, code: true, name: true, phone: true, status: true,
        expiryDate: true, activePlanName: true, balanceDue: true,
        lastCheckInAt: true, waOptOut: true, joinDate: true,
        trainer: { select: { name: true } },
      },
    }),
    db.member.count({ where }),
    db.membershipPlan.findMany({
      where: { gymId: gym.id },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    }),
    db.trainer.findMany({
      where: { gymId: gym.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    Promise.all(
      DERIVED_STATUS.filter((s) => s !== "NO_PLAN").map(async (s) => ({
        status: s,
        count: await db.member.count({ where: { gymId: gym.id, ...statusWhere(s, tz) } }),
      })),
    ),
  ]);

  const params = { q, status, plan: planName, trainer: trainerId, sort };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Members"
        subtitle={`${num(total)} ${total === 1 ? "member" : "members"} matching this view`}
        action={
          <>
            <LinkButton href="/app/members/import" variant="secondary" size="md">
              <IconUpload className="size-4" />
              Import
            </LinkButton>
            <a
              href={buildUrl("/api/export/members", params, {})}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
              <IconDownload className="size-4" />
              Export CSV
            </a>
            <LinkButton href="/app/members/new">
              <IconPlus className="size-4" />
              Add member
            </LinkButton>
          </>
        }
      />

      {sp.cancelled ? (
        <div className="mb-5">
          <Alert tone="good">Member cancelled. Their payment history has been kept.</Alert>
        </div>
      ) : null}

      {/* Status chips double as filters and as a live breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={buildUrl("/app/members", params, { status: undefined, page: undefined })}
          className={
            status === ""
              ? "rounded-full bg-ink-900 px-3 py-1.5 text-[12.5px] font-medium text-white"
              : "rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:border-ink-300"
          }
        >
          All
        </Link>
        {statusCounts.map((s) => (
          <Link
            key={s.status}
            href={buildUrl("/app/members", params, { status: s.status, page: undefined })}
            className={
              status === s.status
                ? "inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-[12.5px] font-medium text-white"
                : "inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:border-ink-300"
            }
          >
            <span className={`size-1.5 rounded-full ${STATUS_DOTS[s.status]}`} />
            {STATUS_LABELS[s.status]}
            <span className="nums opacity-60">{s.count}</span>
          </Link>
        ))}
      </div>

      <Card pad={false}>
        <div className="border-b border-ink-200 p-4">
          <SearchFilters
            action="/app/members"
            q={q}
            placeholder="Name, phone or member ID…"
            hidden={{ status: status || undefined }}
          >
            <FilterSelect
              name="plan"
              value={planName}
              label="All plans"
              options={plans.map((p) => ({ value: p.name, label: p.name }))}
            />
            <FilterSelect
              name="trainer"
              value={trainerId}
              label="All trainers"
              options={trainers.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FilterSelect
              name="sort"
              value={sort}
              label="Sort by"
              options={[
                { value: "recent", label: "Recently added" },
                { value: "name", label: "Name (A–Z)" },
                { value: "expiry", label: "Expiry date" },
                { value: "dues", label: "Highest dues" },
                { value: "visit", label: "Last visit" },
              ]}
            />
          </SearchFilters>
        </div>

        {members.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconUsers className="size-8" />}
              title={q || status ? "No members match this view" : "No members yet"}
              body={
                q || status
                  ? "Try clearing the search or switching status filters."
                  : "Add your first member, or import your existing spreadsheet in one go."
              }
              action={
                q || status ? (
                  <LinkButton href="/app/members" variant="secondary" size="sm">
                    Clear filters
                  </LinkButton>
                ) : (
                  <div className="flex gap-2">
                    <LinkButton href="/app/members/new" size="sm">
                      Add member
                    </LinkButton>
                    <LinkButton href="/app/members/import" variant="secondary" size="sm">
                      Import CSV
                    </LinkButton>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Status</Th>
                  <Th>Plan</Th>
                  <Th>Expires</Th>
                  <Th align="right">Dues</Th>
                  <Th>Last visit</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const derived = deriveStatus(m, tz);
                  const left = daysRemaining(m.expiryDate, tz);
                  return (
                    <Tr key={m.id}>
                      <Td>
                        <Link href={`/app/members/${m.id}`} className="group flex items-center gap-3">
                          <Avatar name={m.name} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13.5px] font-medium text-ink-900 group-hover:text-brand-700">
                                {m.name}
                              </span>
                              {m.waOptOut ? (
                                <span
                                  title="Opted out of WhatsApp"
                                  className="rounded bg-ink-200 px-1 text-[9.5px] font-semibold uppercase text-ink-600"
                                >
                                  no wa
                                </span>
                              ) : null}
                            </span>
                            <span className="block truncate text-[11.5px] text-ink-500">
                              {displayPhone(m.phone)}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <Badge className={STATUS_STYLES[derived]} dot={STATUS_DOTS[derived]}>
                          {STATUS_LABELS[derived]}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="block text-[13px] text-ink-800">
                          {m.activePlanName ?? "—"}
                        </span>
                        {m.trainer ? (
                          <span className="block text-[11px] text-ink-500">{m.trainer.name}</span>
                        ) : null}
                      </Td>
                      <Td>
                        {m.expiryDate ? (
                          <>
                            <span className="block text-[13px] text-ink-800">
                              {fmtDate(m.expiryDate)}
                            </span>
                            <span
                              className={
                                left !== null && left < 0
                                  ? "text-[11px] font-medium text-bad-600"
                                  : left !== null && left <= 7
                                    ? "text-[11px] font-medium text-warn-600"
                                    : "text-[11px] text-ink-500"
                              }
                            >
                              {relativeDayLabel(m.expiryDate, tz)}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] text-ink-400">no plan</span>
                        )}
                      </Td>
                      <Td align="right" className="nums text-[13px]">
                        {m.balanceDue > 0 ? (
                          <span className="font-semibold text-warn-700">{money(m.balanceDue)}</span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </Td>
                      <Td className="text-[12.5px] text-ink-600">
                        {m.lastCheckInAt ? relativeDayLabel(m.lastCheckInAt, tz) : "never"}
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          {!m.waOptOut ? (
                            <a
                              href={waDeepLink(m.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${displayPhone(m.phone)}`}
                              className="grid size-7 place-items-center rounded-md text-good-600 transition-colors hover:bg-good-50"
                            >
                              <IconWhatsApp className="size-4" />
                            </a>
                          ) : null}
                          <Link
                            href={`/app/members/${m.id}/renew`}
                            className="rounded-md px-2 py-1 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                          >
                            Renew
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              base="/app/members"
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
