import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { TemplateEditor } from "@/components/forms/template-editor";
import { Alert, Button, Card, CardHeader, PageHeader, Pill } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { TEMPLATE_VARS } from "@/lib/templates";
import { describeRule } from "@/lib/provisioning";
import { num } from "@/lib/format";

import { deleteTemplate, resetTemplate, saveTemplate } from "../actions";

export const metadata: Metadata = { title: "Edit template" };

export default async function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const { id } = await params;
  const { created, error } = await searchParams;
  const { gym } = await requireStaff();

  const template = await db.waTemplate.findFirst({ where: { id, gymId: gym.id } });
  if (!template) notFound();

  const [rules, sentCount] = await Promise.all([
    db.reminderRule.findMany({
      where: { gymId: gym.id, templateKey: template.key },
      select: { id: true, name: true, trigger: true, offsetDays: true, enabled: true },
    }),
    db.messageLog.count({ where: { gymId: gym.id, templateKey: template.key } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={template.name}
        subtitle={`Sent ${num(sentCount)} times · key ${template.key}`}
      />

      {created ? (
        <div className="mb-5">
          <Alert tone="good">
            Template created. Attach it to an automation to start sending it.
          </Alert>
        </div>
      ) : null}
      {error === "inuse" ? (
        <div className="mb-5">
          <Alert tone="bad" title="Can't delete this template">
            An automation still uses it. Point that rule at another template first.
          </Alert>
        </div>
      ) : null}

      {rules.length > 0 ? (
        <Card className="mb-5">
          <CardHeader
            title="Used by these automations"
            subtitle="Edits here change what those rules send from now on."
          />
          <ul className="mt-3 space-y-1.5">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                <Link
                  href={`/app/automations?edit=${r.id}`}
                  className="truncate font-medium text-brand-700 hover:text-brand-800"
                >
                  {r.name}
                </Link>
                <span className="shrink-0 text-[11.5px] text-ink-500">
                  {describeRule(r.trigger, r.offsetDays)} · {r.enabled ? "on" : "off"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <TemplateEditor
        action={saveTemplate.bind(null, template.id)}
        variables={TEMPLATE_VARS}
        isSystem={template.isSystem}
        submitLabel="Save template"
        cancelHref="/app/templates"
        values={{
          key: template.key,
          name: template.name,
          category: template.category,
          body: template.body,
          active: template.active,
        }}
      />

      <Card className="mt-5">
        <CardHeader title="Template actions" />
        <div className="mt-3 space-y-3">
          {template.isSystem ? (
            <form action={resetTemplate} className="flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="templateId" value={template.id} />
              <span className="text-[12.5px] text-ink-600">
                Restore Astryx&apos;s original wording for this built-in template.
              </span>
              <Button type="submit" variant="secondary" size="sm">
                Reset to default
              </Button>
            </form>
          ) : (
            <form action={deleteTemplate} className="flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="templateId" value={template.id} />
              <span className="text-[12.5px] text-ink-600">
                Delete this template permanently. Messages already sent are kept in your log.
              </span>
              <Button type="submit" variant="danger" size="sm">
                Delete template
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
