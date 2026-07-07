import { revalidatePath } from "next/cache";
import { AlertCircle, FileQuestion } from "lucide-react";
import {
  ApiError,
  API_BASE_URL,
  boxbrainApi,
  type Comment,
  type ContentUnitWhereUsedReference,
  type Note,
  type SearchResultItem,
  type WorkProductFamilyCard,
  type WorkProductVersionDetail
} from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { WorkProductDetail } from "@/components/work-products/work-product-detail";

export const dynamic = "force-dynamic";

type WorkProductLoadResult =
  | {
      status: "ok";
      workProduct: WorkProductVersionDetail;
      families: WorkProductFamilyCard[];
      comments: Comment[];
      notes: Note[];
      similarByUnit: Record<string, SearchResultItem[]>;
      whereUsedByUnit: Record<string, ContentUnitWhereUsedReference[]>;
    }
  | { status: "restricted" }
  | { status: "not_found"; id: string }
  | { status: "error"; message: string };

export default async function WorkProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadWorkProduct(id);

  if (result.status === "restricted") return <RestrictedWorkProduct />;
  if (result.status === "not_found") return <WorkProductNotFound id={result.id} />;
  if (result.status === "error") return <WorkProductError message={result.message} />;

  return (
    <WorkProductDetail
      workProduct={result.workProduct}
      families={result.families}
      comments={result.comments}
      notes={result.notes}
      similarByUnit={result.similarByUnit}
      whereUsedByUnit={result.whereUsedByUnit}
      apiBaseUrl={API_BASE_URL}
      createCommentAction={createWorkProductCommentAction}
      createNoteAction={createWorkProductNoteAction}
    />
  );
}

async function loadWorkProduct(id: string): Promise<WorkProductLoadResult> {
  try {
    const workProduct = await boxbrainApi.getWorkProductVersion(id);
    const [families, comments, notes, ancillary] = await Promise.all([
      safeListWorkProductFamilies(),
      safeListComments(workProduct.id),
      safeListNotes(workProduct.id),
      loadFilmstripAncillary(workProduct)
    ]);
    return {
      status: "ok",
      workProduct,
      families,
      comments,
      notes,
      similarByUnit: ancillary.similarByUnit,
      whereUsedByUnit: ancillary.whereUsedByUnit
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    if (error instanceof ApiError && error.status === 404) return { status: "not_found", id };
    return { status: "error", message: error instanceof Error ? error.message : "The WorkProduct API request failed." };
  }
}

async function loadFilmstripAncillary(workProduct: WorkProductVersionDetail) {
  const entries = await Promise.all(
    workProduct.filmstrip.map(async (unit) => {
      const [similar, whereUsed] = await Promise.all([safeListSimilar(unit.id), safeListWhereUsed(unit.id)]);
      return [unit.id, { similar, whereUsed }] as const;
    })
  );

  return entries.reduce(
    (acc, [id, value]) => {
      acc.similarByUnit[id] = value.similar;
      acc.whereUsedByUnit[id] = value.whereUsed;
      return acc;
    },
    {
      similarByUnit: {} as Record<string, SearchResultItem[]>,
      whereUsedByUnit: {} as Record<string, ContentUnitWhereUsedReference[]>
    }
  );
}

async function safeListWorkProductFamilies() {
  try {
    return (await boxbrainApi.listWorkProductFamilies()).items ?? [];
  } catch {
    return [];
  }
}

async function safeListSimilar(versionId: string) {
  try {
    return await boxbrainApi.listSimilarContentUnits(versionId);
  } catch {
    return [];
  }
}

async function safeListWhereUsed(versionId: string) {
  try {
    return await boxbrainApi.listContentUnitWhereUsed(versionId);
  } catch {
    return [];
  }
}

async function safeListComments(versionId: string) {
  try {
    return await boxbrainApi.listComments("work_product_version", versionId);
  } catch {
    return [];
  }
}

async function safeListNotes(versionId: string) {
  try {
    return await boxbrainApi.listNotes("work_product_version", versionId);
  } catch {
    return [];
  }
}

async function createWorkProductCommentAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  await boxbrainApi.createComment({
    kind: "persistent_comment",
    targetType: "work_product_version",
    targetId: versionId,
    body: requiredFormValue(formData, "body")
  });
  revalidateWorkProductPaths(pageId, versionId);
}

async function createWorkProductNoteAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  await boxbrainApi.createNote({
    targetType: "work_product_version",
    targetId: versionId,
    title: optionalFormValue(formData, "title"),
    body: requiredFormValue(formData, "body"),
    noteType: optionalFormValue(formData, "noteType") ?? "review_note",
    isPinned: formData.get("isPinned") === "on"
  });
  revalidateWorkProductPaths(pageId, versionId);
}

function revalidateWorkProductPaths(pageId: string, versionId: string) {
  revalidatePath(`/work-products/${pageId}`);
  revalidatePath(`/publish/${versionId}`);
}

function requiredFormValue(formData: FormData, field: string) {
  const value = optionalFormValue(formData, field);
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

function optionalFormValue(formData: FormData, field: string) {
  const value = formData.get(field);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function WorkProductError({ message }: { message: string }) {
  return (
    <div className="route-body" data-testid="work-product-error">
      <PageHeader eyebrow="WorkProduct detail" title="WorkProduct unavailable" description="The live WorkProduct API could not be loaded." />
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

function WorkProductNotFound({ id }: { id: string }) {
  return (
    <div className="route-body" data-testid="work-product-not-found">
      <PageHeader eyebrow="WorkProduct detail" title="WorkProduct not found" description={`No visible WorkProduct version was returned for ${id}.`} />
      <Card className="border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <FileQuestion size={18} className="mt-0.5 shrink-0 text-[var(--ink-3)]" aria-hidden="true" />
          <div>
            <div className="font-bold">No detail available</div>
            <p className="m-0 mt-1 text-sm text-[var(--ink-3)]">The detail endpoint requires a WorkProduct version id. Family cards do not currently expose a latest version id.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedWorkProduct() {
  return (
    <div className="route-body" data-testid="work-product-restricted">
      <PageHeader eyebrow="WorkProduct detail" title="Restricted WorkProduct" description="This WorkProduct version is not available to the current user." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No preview, snippets, filmstrip items, comments, notes, or provenance details are shown for restricted content.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
