import Link from "next/link";
import type { Metadata } from "next";

import { StaffForm } from "@/components/forms/settings-forms";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { fmtDateTime, relativeDayLabel } from "@/lib/dates";
import { num } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

import { saveStaff, toggleStaff } from "../actions";

export const metadata: Metadata = { title: "Staff & access" };

export default async function StaffSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: isNew } = await searchParams;
  // Staff management is owner-only — a manager shouldn't be able to grant
  // themselves owner rights.
  const { gym, staff: me } = await requireRole(["OWNER"]);

  const team = await db.staffUser.findMany({
    where: { gymId: gym.id },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  const editing = edit ? team.find((s) => s.id === edit) : undefined;
  const activeCount = team.filter((s) => s.active).length;
  const limit = gym.saasPlan?.staffLimit ?? 0;
  const atLimit = limit > 0 && activeCount >= limit;

  return (
    <div className="space-y-5">
      {isNew || editing ? (
        <Card>
          <CardHeader
            title={editing ? `Edit ${editing.name}` : "New staff login"}
            action={
              <Link
                href="/app/settings/staff"
                className="text-[13px] font-medium text-ink-500 hover:text-ink-800"
              >
                Close
              </Link>
            }
          />
          <div className="mt-4">
            <StaffForm
              action={saveStaff.bind(null, editing?.id ?? null)}
              isEdit={Boolean(editing)}
              submitLabel={editing ? "Save changes" : "Create login"}
              values={
                editing
                  ? {
                      name: editing.name,
                      email: editing.email,
                      phone: editing.phone ?? undefined,
                      role: editing.role,
                    }
                  : undefined
              }
            />
          </div>
        </Card>
      ) : null}

      {atLimit && !isNew && !editing ? (
        <Alert tone="warn" title="Staff limit reached">
          Your {gym.saasPlan?.name} plan includes {limit} logins. Upgrade your subscription
          to add more.
        </Alert>
      ) : null}

      <Card pad={false}>
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <CardHeader
            title="Your team"
            subtitle={`${num(activeCount)} of ${limit > 0 ? num(limit) : "unlimited"} logins in use`}
          />
          {!atLimit ? (
            <Link
              href="/app/settings/staff?new=1"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              <IconPlus className="size-3.5" />
              Add login
            </Link>
          ) : null}
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Contact</Th>
              <Th>Last sign-in</Th>
              <Th>Status</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {team.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} size="sm" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-medium text-ink-900">
                          {s.name}
                        </span>
                        {s.id === me.id ? (
                          <span className="rounded bg-brand-100 px-1 text-[9.5px] font-semibold uppercase text-brand-700">
                            you
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-500">{s.email}</span>
                    </span>
                  </div>
                </Td>
                <Td>
                  <Badge
                    className={
                      s.role === "OWNER"
                        ? "bg-brand-50 text-brand-700 ring-brand-500/20"
                        : s.role === "MANAGER"
                          ? "bg-info-50 text-info-700 ring-info-500/20"
                          : "bg-ink-100 text-ink-700 ring-ink-400/20"
                    }
                  >
                    {ROLE_LABELS[s.role] ?? s.role}
                  </Badge>
                </Td>
                <Td className="text-[12.5px] text-ink-600">
                  {s.phone ? displayPhone(s.phone) : "—"}
                </Td>
                <Td className="text-[12.5px] text-ink-600">
                  {s.lastLoginAt ? relativeDayLabel(s.lastLoginAt, gym.timezone) : "never"}
                </Td>
                <Td>
                  {s.active ? (
                    <Badge className="bg-good-50 text-good-700 ring-good-500/20" dot="bg-good-500">
                      active
                    </Badge>
                  ) : (
                    <Badge className="bg-ink-100 text-ink-500 ring-ink-400/20">disabled</Badge>
                  )}
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/app/settings/staff?edit=${s.id}`}
                      className="rounded-md px-2 py-1 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      Edit
                    </Link>
                    {s.id !== me.id ? (
                      <form action={toggleStaff}>
                        <input type="hidden" name="staffId" value={s.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
                        >
                          {s.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
