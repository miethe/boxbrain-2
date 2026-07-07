import Link from "next/link";
import { redirect } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PublishPage({ searchParams }: { searchParams?: Promise<{ versionId?: string }> }) {
  const query = (await searchParams) ?? {};
  if (query.versionId) redirect(`/publish/${query.versionId}`);

  return (
    <div className="route-body" data-testid="publish-unscoped">
      <PageHeader
        eyebrow="Publish and package"
        title="Choose a WorkProduct version"
        description="Publish review is scoped to a specific WorkProduct version. Open it from a WorkProduct detail page so package and provenance checks can use live data."
      />
      <Card className="max-w-2xl p-5">
        <div className="flex items-start gap-3">
          <FileQuestion size={18} className="mt-0.5 shrink-0 text-[var(--ink-3)]" aria-hidden="true" />
          <div>
            <div className="font-bold">No WorkProduct version selected</div>
            <p className="m-0 mt-1 text-sm text-[var(--ink-3)]">
              The WorkProduct families API does not expose latest version ids, so this page cannot safely pick a default deck.
            </p>
            <Link href="/work-products/00000000-0000-4000-8000-000000001102" className="btn btn-primary btn-sm mt-3">
              Open seeded Q2 WorkProduct
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
