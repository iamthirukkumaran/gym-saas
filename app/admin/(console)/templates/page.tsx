import Link from "next/link";
import type { Metadata } from "next";

import { TemplateEditor } from "@/components/forms/template-editor";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
} from "@/components/ui";
import { IconPlus, IconZap } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { TEMPLATE_VARS } from "@/lib/templates";
import { num, plural, truncate } from "@/lib/format";
import { TRIGGER_LABELS, type Trigger } from "@/lib/constants";

import { pushTemplateToTenants, saveSystemTemplate } from "../../actions";

export const metadata: Metadata = { title: "Template library" };

/**
 * The master WhatsApp copy library.
 *
 * Every new tenant is seeded from here, so improving a template here lifts
 * conversion for every gym signed up afterwards. Pushing to existing tenants
 * is explicit and skips anyone who edited their own copy.
 */
export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: isNew } = await searchParams;
  const { user } = await requirePlatform();
  const isSuper = user.role === "SUPERADMIN";

  const templates = await db.systemTemplate.findMany({ orderBy: { sortOrder: "asc" } });
  const editing = edit ? templates.find((t) => t.id === edit) : undefined;

  // How many tenant copies still match what we shipped (i.e. uncustomised).
  const tenantCopies = await db.waTemplate.groupBy({
    by: ["key"],
    _count: { _all: true },
  });
  const copyCount = new Map(tenantCopies.map((t) => [t.key, t._count._all]));

  const customised = new Map<string, number>();
  for (const t of templates) {
    const total = await db.waTemplate.count({ where: { key: t.key } });
    const same = await db.waTemplate.count({ where: { key: t.key, body: t.body } });
    customised.set(t.key, total - same);
  }

  const CATEGORY_STYLES: Record<string, string> = {
    UTILITY: "bg-info-50 text-info-700 ring-info-500/20",
    MARKETING: "bg-brand-50 text-brand-700 ring-brand-500/20",
    SERVICE: "bg-good-50 text-good-700 ring-good-500/20",
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Template library"
        subtitle="The copy every new gym starts with. Improving it here raises renewals across the whole platform."
        action={
          isSuper ? (
            <Link
              href="/admin/templates?new=1"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <IconPlus className="size-4" />
              New template
            </Link>
          ) : null
        }
      />

      {isSuper && (isNew || editing) ? (
        <div className="mb-5">
          <Card className="mb-3">
            <CardHeader
              title={editing ? `Edit "${editing.name}"` : "New library template"}
              action={
                <Link
                  href="/admin/templates"
                  className="text-[13px] font-medium text-ink-500 hover:text-ink-800"
                >
                  Close
                </Link>
              }
            />
          </Card>
          <TemplateEditor
            action={saveSystemTemplate.bind(null, editing?.id ?? null)}
            variables={TEMPLATE_VARS}
            isSystem={Boolean(editing)}
            submitLabel={editing ? "Save library copy" : "Add to library"}
            cancelHref="/admin/templates"
            values={
              editing
                ? {
                    key: editing.key,
                    name: editing.name,
                    category: editing.category,
                    body: editing.body,
                    active: true,
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="mb-5">
        <Alert tone="info" title="How pushing works">
          &ldquo;Push to tenants&rdquo; updates only gyms whose copy still matches what we
          originally shipped. Any gym that has edited their own wording is skipped — we
          never overwrite an owner&apos;s words.
        </Alert>
      </div>

      {templates.length === 0 ? (
        <EmptyState title="Library is empty" body="Add templates so new tenants arrive with working automations." />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const copies = copyCount.get(t.key) ?? 0;
            const edited = customised.get(t.key) ?? 0;
            return (
              <Card key={t.id} pad={false}>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold text-ink-900">{t.name}</h3>
                        <Badge className={CATEGORY_STYLES[t.category] ?? ""}>
                          {t.category.toLowerCase()}
                        </Badge>
                        {t.defaultRule && t.trigger ? (
                          <Badge className="bg-ink-100 text-ink-700 ring-ink-400/20" dot="bg-brand-500">
                            auto-rule
                          </Badge>
                        ) : null}
                      </div>

                      {t.description ? (
                        <p className="mt-1 text-[12.5px] text-ink-600">{t.description}</p>
                      ) : null}

                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
                        {truncate(t.body.replace(/\n{2,}/g, "\n"), 300)}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
                        <Pill>{t.key}</Pill>
                        {t.trigger ? (
                          <span className="inline-flex items-center gap-1">
                            <IconZap className="size-3 text-brand-500" />
                            {TRIGGER_LABELS[t.trigger as Trigger] ?? t.trigger}
                            {t.defaultOffset > 0 ? ` · ${t.defaultOffset}d` : ""}
                          </span>
                        ) : null}
                        <span>
                          {num(copies)} tenant {plural(copies, "copy", "copies")}
                        </span>
                        {edited > 0 ? (
                          <span className="text-warn-700">
                            {num(edited)} customised (won&apos;t be overwritten)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isSuper ? (
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <Link
                          href={`/admin/templates?edit=${t.id}`}
                          className="rounded-md px-2 py-1 text-center text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          Edit
                        </Link>
                        <form action={pushTemplateToTenants}>
                          <input type="hidden" name="templateId" value={t.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Push to tenants
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
