import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { FilterSelect, Pagination, SearchFilters } from "@/components/data-controls";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconHistory } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, relativeDayLabel } from "@/lib/dates";
import { num, truncate } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 40;

/**
 * The append-only record of who did what.
 *
 * Matters most for impersonation and billing changes: when support opens a
 * customer's account or changes their plan, that has to be permanently
 * attributable to a named person.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  await requirePlatform();

  const q = sp.q?.trim() ?? "";
  const actorType = sp.actor ?? "";
  const gymId = sp.gym ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(actorType ? { actorType } : {}),
    ...(gymId ? { gymId } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q } },
            { actorName: { contains: q } },
            { entity: { contains: q } },
            { metaJson: { contains: q } },
          ],
        }
      : {}),
  };

  const [entries, total, gyms] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { gym: { select: { id: true, name: true } } },
    }),
    db.auditLog.count({ where }),
    db.gym.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const ACTOR_STYLE: Record<string, string> = {
    PLATFORM: "bg-brand-50 text-brand-700 ring-brand-500/20",
    STAFF: "bg-good-50 text-good-700 ring-good-500/20",
    SYSTEM: "bg-ink-100 text-ink-600 ring-ink-400/20",
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Audit log"
        subtitle={`${num(total)} recorded ${total === 1 ? "event" : "events"}. Append-only — nothing here can be edited or deleted.`}
      />

      <Card pad={false}>
        <div className="border-b border-ink-200 p-4">
          <SearchFilters action="/admin/audit" q={q} placeholder="Action, person or entity…">
            <FilterSelect
              name="actor"
              value={actorType}
              label="Any actor"
              options={[
                { value: "PLATFORM", label: "Astryx staff" },
                { value: "STAFF", label: "Gym staff" },
                { value: "SYSTEM", label: "System" },
              ]}
            />
            <FilterSelect
              name="gym"
              value={gymId}
              label="All gyms"
              options={gyms.map((g) => ({ value: g.id, label: g.name }))}
            />
          </SearchFilters>
        </div>

        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconHistory className="size-8" />}
              title="Nothing logged yet"
              body="Actions appear here as soon as anyone uses the product."
            />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Gym</Th>
                  <Th>Entity</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <span className="block text-[12px] text-ink-800">
                        {relativeDayLabel(e.createdAt)}
                      </span>
                      <span className="block text-[10.5px] text-ink-400">
                        {fmtDateTime(e.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <Badge className={ACTOR_STYLE[e.actorType] ?? ""}>
                        {e.actorType.toLowerCase()}
                      </Badge>
                      {e.actorName ? (
                        <span className="mt-0.5 block max-w-32 truncate text-[11px] text-ink-600">
                          {e.actorName}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-[12.5px] font-medium text-ink-900">{e.action}</Td>
                    <Td>
                      {e.gym ? (
                        <Link
                          href={`/admin/gyms/${e.gym.id}`}
                          className="block max-w-32 truncate text-[12px] text-brand-700 hover:text-brand-800"
                        >
                          {e.gym.name}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-ink-400">platform</span>
                      )}
                    </Td>
                    <Td className="text-[11.5px] text-ink-500">
                      {e.entity ? <Pill>{e.entity}</Pill> : "—"}
                    </Td>
                    <Td className="max-w-xs">
                      {e.metaJson ? (
                        <span className="block truncate font-mono text-[10.5px] text-ink-500">
                          {truncate(e.metaJson, 90)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              base="/admin/audit"
              params={{ q, actor: actorType, gym: gymId }}
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
