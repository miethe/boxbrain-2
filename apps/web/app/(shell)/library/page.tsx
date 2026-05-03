import Link from "next/link";
import { Grid2X2, ListFilter, Plus } from "lucide-react";
import { Button, Card, PageHeader, ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, workProducts } from "@/features/demo/data";

export default function LibraryPage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Library"
        title="Family-first governed catalog"
        description="Browse conceptual families first, then expand variants and versions only when the query requires specificity."
        actions={
          <>
            <Button>
              <ListFilter size={14} /> Filters
            </Button>
            <Button variant="primary">
              <Plus size={14} /> New collection
            </Button>
          </>
        }
      />
      <div className="tabs mb-4">
        <div className="tab active">ContentUnits</div>
        <div className="tab">WorkProducts</div>
        <div className="tab">ContentBlocks</div>
        <div className="tab">Collections</div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="grid gap-4">
          {contentFamilies.map((family) => (
            <Card key={family.id} className="overflow-hidden">
              <div className="grid gap-4 p-4 md:grid-cols-[190px_minmax(0,1fr)_150px]">
                <SlideThumb title={family.title} variant={family.thumb} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/content-units/${family.id}`} className="text-base font-bold hover:text-blue-700">
                      {family.title}
                    </Link>
                    {family.restricted && <StatusBadge tone="danger">restricted</StatusBadge>}
                    <StatusBadge tone={family.trust === "approved" ? "ok" : family.trust === "review" ? "warn" : "neutral"}>{family.trust}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{family.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {family.taxonomy.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
                <div className="grid content-start gap-2 text-sm text-slate-500">
                  <ScorePill value={family.similarity} />
                  <div>{family.variantCount} variants</div>
                  <div>{family.versionCount} versions</div>
                  <div>{family.usageCount} uses</div>
                </div>
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Provenance: {family.provenance} · canonical {family.canonicalVariant} · latest {family.latestVersion}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Grid2X2 size={15} /> WorkProducts
            </div>
            <div className="grid gap-3">
              {workProducts.map((wp) => (
                <Link href={`/work-products/${wp.id}`} key={wp.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <SlideThumb title={wp.title} variant={wp.thumb} />
                  <div className="mt-2 text-sm font-bold">{wp.title}</div>
                  <div className="text-xs text-slate-500">{wp.type} · {wp.version} · {wp.slideCount} slides</div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
