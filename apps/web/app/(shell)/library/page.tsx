import Link from "next/link";
import { AlertCircle, Grid2X2, ListFilter, Plus } from "lucide-react";
import { ApiError, API_BASE_URL, boxbrainApi, type ContentUnitFamilyCard, type StatusChips, type Taxonomy, type WorkProductFamilyCard } from "@/lib/api";
import { Button, Card, EmptyState, PageHeader, ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type LibraryResult =
  | {
      status: "ok";
      families: ContentUnitFamilyCard[];
      workProducts: WorkProductFamilyCard[];
    }
  | {
      status: "restricted";
    }
  | {
      status: "error";
      message: string;
    };

export default async function LibraryPage() {
  const result = await loadLibrary();

  if (result.status === "restricted") {
    return <RestrictedLibrary />;
  }

  if (result.status === "error") {
    return <LibraryError message={result.message} />;
  }

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
        <div className="grid content-start gap-4">
          {result.families.length === 0 ? (
            <EmptyState
              title="No ContentUnit families returned"
              body="The Library API is reachable, but it did not return any visible family cards for this user and filter set."
            />
          ) : (
            result.families.map((family) => <FamilyCard key={family.id} family={family} />)
          )}
        </div>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Grid2X2 size={15} /> WorkProducts
            </div>
            <div className="grid gap-3">
              {result.workProducts.length === 0 ? (
                <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">No WorkProducts returned.</div>
              ) : (
                result.workProducts.map((workProduct) => <WorkProductLink key={workProduct.id} workProduct={workProduct} />)
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function loadLibrary(): Promise<LibraryResult> {
  try {
    const [familyEnvelope, workProductEnvelope] = await Promise.all([boxbrainApi.listContentUnitFamilies(), boxbrainApi.listWorkProductFamilies()]);
    return {
      status: "ok",
      families: familyEnvelope.items ?? [],
      workProducts: workProductEnvelope.items ?? []
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The Library API request failed." };
  }
}

function FamilyCard({ family }: { family: ContentUnitFamilyCard }) {
  const status = family.statusChips;
  const tags = taxonomyTags(family.taxonomy);
  const previewUri = family.canonicalPreviewUri;
  const qualityScore = scoreFromStatus(status);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[190px_minmax(0,1fr)_150px]">
        {previewUri ? <RenderedPreview uri={previewUri} title={family.familyTitle} /> : <SlideThumb title={family.familyTitle} variant="light" />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/content-units/${family.id}`} className="text-base font-bold hover:text-blue-700">
              {family.familyTitle}
            </Link>
            {status?.isRestricted && <StatusBadge tone="danger">restricted</StatusBadge>}
            {status?.approvalState && <StatusBadge tone={approvalTone(status.approvalState)}>{status.approvalState}</StatusBadge>}
            {status?.freshnessState && <StatusBadge tone={freshnessTone(status.freshnessState)}>{status.freshnessState}</StatusBadge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{family.conceptualSummary ?? "No conceptual summary returned for this family."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? <Tag>untagged</Tag> : tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
          </div>
        </div>
        <div className="grid content-start gap-2 text-sm text-slate-500">
          <ScorePill value={qualityScore} label="quality" />
          <div>{family.variantCount ?? 0} variants</div>
          <div>{family.versionCount ?? 0} versions</div>
          <div>{family.unitType}</div>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Canonical preview {previewUri ? "available" : "pending"} · link source {status?.linkSource ?? "unknown"} · family {family.id}
      </div>
    </Card>
  );
}

function WorkProductLink({ workProduct }: { workProduct: WorkProductFamilyCard }) {
  return (
    <Link href={`/work-products/${workProduct.id}`} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      {workProduct.previewUri ? <RenderedPreview uri={workProduct.previewUri} title={workProduct.title} /> : <SlideThumb title={workProduct.title} variant="dark" />}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-bold">{workProduct.title}</div>
        {workProduct.statusChips?.approvalState && <StatusBadge tone={approvalTone(workProduct.statusChips.approvalState)}>{workProduct.statusChips.approvalState}</StatusBadge>}
      </div>
      <div className="text-xs text-slate-500">
        {workProduct.artifactType} · {workProduct.variantCount ?? 0} variants · {workProduct.versionCount ?? 0} versions
      </div>
    </Link>
  );
}

function LibraryError({ message }: { message: string }) {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Library" title="Family-first governed catalog" description="The live Library API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Library request failed</div>
            <p className="m-0 mt-1 text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedLibrary() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Library" title="Restricted catalog" description="The current user cannot access the governed Library API." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No family titles, previews, snippets, or WorkProduct links are shown for restricted content.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RenderedPreview({ uri, title }: { uri: string; title: string }) {
  return (
    <div
      className="slide-thumb light bg-cover bg-center"
      aria-label={`${title} preview`}
      style={{
        backgroundImage: `url("${assetUrl(uri)}")`
      }}
    >
      <div className="slide-content bg-white/75">
        <div className="slide-brand">BB</div>
        <div className="slide-title">{title}</div>
      </div>
    </div>
  );
}

function taxonomyTags(taxonomy?: Taxonomy) {
  if (!taxonomy) return [];
  const values = Object.values(taxonomy)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).slice(0, 8);
}

function approvalTone(value: string) {
  if (value === "approved") return "ok";
  if (value === "deprecated" || value === "archived") return "danger";
  if (value === "review") return "warn";
  return "neutral";
}

function freshnessTone(value: string) {
  if (value === "fresh") return "ok";
  if (value === "stale") return "danger";
  return "warn";
}

function scoreFromStatus(status?: StatusChips) {
  if (!status) return 70;
  if (status.approvalState === "approved" && status.freshnessState === "fresh") return 94;
  if (status.approvalState === "review" || status.freshnessState === "aging") return 82;
  if (status.approvalState === "deprecated" || status.freshnessState === "stale") return 64;
  return 74;
}

function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
