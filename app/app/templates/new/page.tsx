import type { Metadata } from "next";

import { TemplateEditor } from "@/components/forms/template-editor";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { TEMPLATE_VARS } from "@/lib/templates";

import { saveTemplate } from "../actions";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplatePage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="New message template"
        subtitle="Write it once; every automation and manual send can use it."
      />
      <TemplateEditor
        action={saveTemplate.bind(null, null)}
        variables={TEMPLATE_VARS}
        submitLabel="Create template"
        cancelHref="/app/templates"
      />
    </div>
  );
}
