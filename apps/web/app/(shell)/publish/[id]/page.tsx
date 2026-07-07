import { AlertCircle, FileQuestion } from "lucide-react";
import { ApiError, API_BASE_URL, boxbrainApi, type WorkProductVersionDetail } from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { PublishReview } from "@/components/work-products/publish-review";

export const dynamic = "force-dynamic";

type PublishLoadResult = { status: "ok"; workProduct: WorkProductVersionDetail } | { status: "restricted" } | { status: "not_found"; id: string } | { status: "error"; message: string };

export default async function PublishVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadPublishWorkProduct(id);

  if (result.status === "restricted") return <RestrictedPublishReview />;
  if (result.status === "not_found") return <PublishWorkProductNotFound id={result.id} />;
  if (result.status === "error") return <PublishWorkProductError message={result.message} />;

  return <PublishReview workProduct={result.workProduct} apiBaseUrl={API_BASE_URL} />;
}

async function loadPublishWorkProduct(id: string): Promise<PublishLoadResult> {
  try {
    return { status: "ok", workProduct: await boxbrainApi.getWorkProductVersion(id) };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    if (error instanceof ApiError && error.status === 404) return { status: "not_found", id };
    return { status: "error", message: error instanceof Error ? error.message : "The WorkProduct API request failed." };
  }
}

function PublishWorkProductError({ message }: { message: string }) {
  return (
    <div className="route-body" data-testid="publish-error">
      <PageHeader eyebrow="Publish and package" title="Publish review unavailable" description="The live WorkProduct API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">WorkProduct request failed</div>
            <p className="m-0 mt-1 text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PublishWorkProductNotFound({ id }: { id: string }) {
  return (
    <div className="route-body" data-testid="publish-not-found">
      <PageHeader eyebrow="Publish and package" title="WorkProduct not found" description={`No visible WorkProduct version was returned for ${id}.`} />
      <Card className="border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <FileQuestion size={18} className="mt-0.5 shrink-0 text-[var(--ink-3)]" aria-hidden="true" />
          <div>
            <div className="font-bold">No publish context available</div>
            <p className="m-0 mt-1 text-sm text-[var(--ink-3)]">Publish review requires a WorkProduct version id, not a family id.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedPublishReview() {
  return (
    <div className="route-body" data-testid="publish-restricted">
      <PageHeader eyebrow="Publish and package" title="Restricted WorkProduct" description="This WorkProduct version is not available to the current user." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No preview, package data, approval context, or provenance details are shown for restricted content.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
