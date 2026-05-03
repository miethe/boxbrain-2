import Link from "next/link";
import { AlertCircle, Download, FileText, Layers, PackageCheck, ShieldCheck } from "lucide-react";
import { ApiError, API_BASE_URL, boxbrainApi, type ContentUnitVersion, type WorkProductVersionDetail } from "@/lib/api";
import { Button, Card, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, workProducts, type WorkProduct } from "@/features/demo/data";

type WorkProductPageModel =
  | {
      source: "api";
      workProduct: WorkProductVersionDetail;
    }
  | {
      source: "demo";
      workProduct: WorkProduct;
    };

export default async function WorkProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadWorkProduct(id);

  if (result.status === "restricted") {
    return <RestrictedWorkProduct />;
  }

  const model = result.model;
  const isApiBacked = model.source === "api";
  const title = model.workProduct.title;
  const description = isApiBacked
    ? model.workProduct.provenance.sourceRefs?.join(" · ") || "API-backed WorkProduct version with governed provenance."
    : model.workProduct.summary;
  const status = isApiBacked ? model.workProduct.approvalState : model.workProduct.status;
  const version = isApiBacked ? model.workProduct.versionNumber : model.workProduct.version;
  const artifactType = isApiBacked ? model.workProduct.artifactType : model.workProduct.type;
  const slideCount = isApiBacked ? model.workProduct.filmstrip.length : model.workProduct.slideCount;

  return (
    <div className="route-body">
      <PageHeader
        eyebrow={isApiBacked ? "WorkProduct version" : "WorkProduct detail"}
        title={title}
        description={description}
        actions={
          <>
            <Link className="btn" href="/storyboards/sb-cloud-modernization">
              <Layers size={14} /> Storyboard
            </Link>
            <Link className="btn btn-primary" href="/publish">
              <PackageCheck size={14} /> Publish review
            </Link>
          </>
        }
      />
      <div className="two-col">
        <Card className="overflow-hidden">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1fr)]">
            <WorkProductPreview model={model} title={title} />
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={status === "approved" ? "ok" : "warn"}>{status}</StatusBadge>
                <Tag>{version}</Tag>
                <Tag>{slideCount} slides</Tag>
                <StatusBadge tone="ai">{isApiBacked ? "api indexed" : "demo indexed"}</StatusBadge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Owner</dt>
                  <dd className="m-0 font-bold">{isApiBacked ? "Repository" : model.workProduct.owner}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="m-0 font-bold">{isApiBacked ? formatDate(model.workProduct.provenance.createdAt) : model.workProduct.updatedAt}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="m-0 font-bold">{artifactType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Source</dt>
                  <dd className="m-0 font-bold">{isApiBacked ? model.workProduct.provenance.originType : "PPTX upload"}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button>
                  <Download size={14} /> Original
                </Button>
                <Button>
                  <FileText size={14} /> Build manifest
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">
            {isApiBacked
              ? "Loaded from /api/work-products/versions with ordered ContentUnit membership and provenance."
              : "Demo fallback shown because the API version detail was unavailable."}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} color="var(--ok)" /> Governance checklist
          </div>
          {["All restricted units are permission checked", "Approved content has provenance", "Snapshot-compatible manifest is ready", "AI metadata is traceable"].map((item) => (
            <div key={item} className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {item}
            </div>
          ))}
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="m-0 text-base font-bold">Contained ContentUnits</h2>
          <p className="m-0 text-sm text-slate-500">Each slide/page is modeled as one atomic unit with ordered source membership.</p>
        </div>
        {isApiBacked ? <ApiFilmstrip items={model.workProduct.filmstrip} /> : <DemoFilmstrip />}
      </Card>
    </div>
  );
}

async function loadWorkProduct(id: string): Promise<{ status: "ok"; model: WorkProductPageModel } | { status: "restricted" }> {
  try {
    const workProduct = await boxbrainApi.getWorkProductVersion(id);
    return { status: "ok", model: { source: "api", workProduct } };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    const workProduct = workProducts.find((item) => item.id === id) ?? workProducts[0];
    return { status: "ok", model: { source: "demo", workProduct } };
  }
}

function WorkProductPreview({ model, title }: { model: WorkProductPageModel; title: string }) {
  if (model.source === "api" && model.workProduct.previewUri) {
    return <RenderedPreview uri={model.workProduct.previewUri} title={title} />;
  }
  if (model.source === "demo") {
    return <SlideThumb title={title} variant={model.workProduct.thumb} brand="BB" />;
  }
  const firstFilmstripItem = model.workProduct.filmstrip.find((item) => item.thumbnailUri || item.renderUri);
  if (firstFilmstripItem?.thumbnailUri || firstFilmstripItem?.renderUri) {
    return <RenderedPreview uri={firstFilmstripItem.thumbnailUri ?? firstFilmstripItem.renderUri ?? ""} title={title} />;
  }
  return <SlideThumb title={title} variant="dark" brand="BB" />;
}

function ApiFilmstrip({ items }: { items: ContentUnitVersion[] }) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm font-bold text-slate-800">No ContentUnits returned</div>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">This WorkProduct version exists, but the API did not return ordered filmstrip membership.</p>
      </div>
    );
  }

  return (
    <div className="grid-auto p-4">
      {items.map((item, index) => (
        <Link href={`/content-units/${item.id}`} key={item.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
          {item.thumbnailUri || item.renderUri ? (
            <RenderedPreview uri={item.thumbnailUri ?? item.renderUri ?? ""} title={item.summary ?? `Slide ${index + 1}`} />
          ) : (
            <SlideThumb title={item.summary ?? `Slide ${index + 1}`} variant={index % 2 === 0 ? "light" : "teal"} />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-sm font-bold">
              {index + 1}. {item.summary ?? item.id}
            </div>
            <StatusBadge tone={item.approvalState === "approved" ? "ok" : "warn"}>{item.approvalState}</StatusBadge>
          </div>
          <div className="mt-1 text-xs text-slate-500">{item.versionNumber}</div>
        </Link>
      ))}
    </div>
  );
}

function DemoFilmstrip() {
  return (
    <div className="grid-auto p-4">
      {contentFamilies.map((family, index) => (
        <Link href={`/content-units/${family.id}`} key={family.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
          <SlideThumb title={family.title} variant={family.thumb} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-sm font-bold">
              {index + 1}. {family.title}
            </div>
            <StatusBadge tone={family.trust === "approved" ? "ok" : "warn"}>{family.trust}</StatusBadge>
          </div>
          <div className="mt-1 text-xs text-slate-500">{family.provenance}</div>
        </Link>
      ))}
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

function RestrictedWorkProduct() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="WorkProduct detail" title="Restricted WorkProduct" description="This WorkProduct version is not available to the current user." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No preview, snippets, filmstrip items, or provenance details are shown for restricted content.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
