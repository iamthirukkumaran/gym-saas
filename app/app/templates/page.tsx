import Link from "next/link";
import type { Metadata } from "next";

import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Pill,
} from "@/components/ui";
import { IconInbox, IconPlus, IconZap } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { num, plural, truncate } from "@/lib/format";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const { gym } = await requireStaff();

  const [templates, rules] = await Promise.all([
    db.waTemplate.findMany({
      where: { gymId: gym.id },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    db.reminderRule.findMany({
      where: { gymId: gym.id },
      select: { templateKey: true, name: true, enabled: true },
    }),
  ]);

  const usage = new Map<string, { name: string; enabled: boolean }[]>();
  for (const r of rules) {
    const list = usage.get(r.templateKey) ?? [];
    list.push({ name: r.name, enabled: r.enabled });
    usage.set(r.templateKey, list);
  }

  const CATEGORY_STYLES: Record<string, string> = {
    UTILITY: "bg-info-50 text-info-700 ring-info-500/20",
    MARKETING: "bg-brand-50 text-brand-700 ring-brand-500/20",
    SERVICE: "bg-good-50 text-good-700 ring-good-500/20",
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Message templates"
        subtitle="The words your members actually read. Edit any of them — the logic stays intact."
        action={
          <LinkButton href="/app/templates/new">
            <IconPlus className="size-4" />
            New template
          </LinkButton>
        }
      />

      {deleted ? (
        <div className="mb-5">
          <Alert tone="good">Template deleted.</Alert>
        </div>
      ) : null}

      <div className="mb-5">
        <Alert tone="info" title="Using Meta Cloud API or a BSP?">
          Business-initiated WhatsApp messages must use a template pre-approved by Meta.
          Astryx sends your approved template name and fills in the variables — write the
          copy here, then register the matching template with your provider.
        </Alert>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<IconInbox className="size-8" />}
          title="No templates yet"
          body="Astryx normally ships twelve ready-to-use templates."
          action={
            <LinkButton href="/app/templates/new" size="sm">
              Create one
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const used = usage.get(t.key) ?? [];
            return (
              <Card key={t.id} pad={false}>
                <Link
                  href={`/app/templates/${t.id}`}
                  className="block p-5 transition-colors hover:bg-ink-50/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold text-ink-900">{t.name}</h3>
                        <Badge className={CATEGORY_STYLES[t.category] ?? ""}>
                          {t.category.toLowerCase()}
                        </Badge>
                        {t.isSystem ? (
                          <Badge className="bg-ink-100 text-ink-600 ring-ink-400/20">built-in</Badge>
                        ) : null}
                        {!t.active ? (
                          <Badge className="bg-bad-50 text-bad-700 ring-bad-500/20">inactive</Badge>
                        ) : null}
                      </div>

                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
                        {truncate(t.body.replace(/\n{2,}/g, "\n"), 260)}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-500">
                        <Pill>{t.key}</Pill>
                        {used.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <IconZap className="size-3 text-brand-500" />
                            used by {num(used.length)} {plural(used.length, "automation")}
                            {used.some((u) => !u.enabled) ? " (some off)" : ""}
                          </span>
                        ) : (
                          <span>not used by any automation</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium text-brand-600">Edit →</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
