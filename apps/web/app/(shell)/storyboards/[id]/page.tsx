import Link from "next/link";
import { AlertCircle, GitBranchPlus, Plus } from "lucide-react";
import {
  ApiError,
  boxbrainApi,
  type Comment,
  type ContentBlockVersionDetail,
  type Storyboard,
  type StoryboardDetail,
  type StoryboardDiagnostics,
  type StoryboardSnapshot
} from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { collectObjectRefs, objectDetailKey, type ObjectRef, type SlotObjectDetail } from "@/features/storyboards/lib";
import {
  addGapSlotAction,
  addSlotFromLibraryAction,
  createAnchoredCommentAction,
  createSlotObjectNoteAction,
  createSnapshotAction,
  createStoryboardAction,
  insertSectionAction,
  renameSectionAction,
  reorderSectionsAction,
  reorderSlotsAction,
  swapSlotContentAction
} from "@/features/storyboards/actions";
import { StoryboardWorkspace } from "@/components/storyboards/workspace-client";
import type { StoryboardActions } from "@/components/storyboards/types";

type StoryboardLoadResult =
  | {
      status: "ok";
      storyboard: StoryboardDetail;
      snapshots: StoryboardSnapshot[];
      selectedSnapshot?: StoryboardSnapshot;
      diagnostics: StoryboardDiagnostics;
      comments: Comment[];
      contentBlocks: ContentBlockVersionDetail[];
      objectDetails: Record<string, SlotObjectDetail>;
    }
  | {
      status: "restricted";
    }
  | {
      status: "not_found";
      storyboards: Storyboard[];
    }
  | {
      status: "error";
      message: string;
    };

export default async function StoryboardPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ snapshotId?: string }>;
}) {
  const { id } = await params;
  const { snapshotId } = (await searchParams) ?? {};
  const result = await loadStoryboard(id, snapshotId);

  if (result.status === "restricted") return <RestrictedStoryboard />;
  if (result.status === "not_found") return <StoryboardNotFound id={id} storyboards={result.storyboards} />;
  if (result.status === "error") return <StoryboardError message={result.message} />;

  const actions: StoryboardActions = {
    insertSection: insertSectionAction,
    renameSection: renameSectionAction,
    reorderSections: reorderSectionsAction,
    addSlotFromLibrary: addSlotFromLibraryAction,
    addGapSlot: addGapSlotAction,
    swapSlotContent: swapSlotContentAction,
    reorderSlots: reorderSlotsAction,
    createSnapshot: createSnapshotAction,
    createAnchoredComment: createAnchoredCommentAction,
    createSlotObjectNote: createSlotObjectNoteAction
  };

  return (
    <div className="route-body" data-testid="storyboard-page">
      <StoryboardWorkspace
        storyboard={result.storyboard}
        snapshots={result.snapshots}
        selectedSnapshot={result.selectedSnapshot}
        diagnostics={result.diagnostics}
        comments={result.comments}
        contentBlocks={result.contentBlocks}
        objectDetails={result.objectDetails}
        actions={actions}
      />
    </div>
  );
}

async function loadStoryboard(id: string, snapshotId?: string): Promise<StoryboardLoadResult> {
  try {
    const storyboard = await boxbrainApi.getStoryboard(id);
    const [snapshots, diagnostics, comments, contentBlockEnvelope, selectedSnapshot] = await Promise.all([
      safeListSnapshots(storyboard.id),
      safeAnalyze(storyboard.id),
      safeListComments(storyboard.id),
      safeListContentBlocks(),
      snapshotId ? safeGetSnapshot(snapshotId) : Promise.resolve(undefined)
    ]);
    const objectDetails = await loadObjectDetails(collectObjectRefs(storyboard.draftSections), contentBlockEnvelope.items ?? []);
    return {
      status: "ok",
      storyboard,
      snapshots,
      selectedSnapshot,
      diagnostics,
      comments,
      contentBlocks: contentBlockEnvelope.items ?? [],
      objectDetails
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not_found", storyboards: (await safeListStoryboards()).items ?? [] };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The Storyboard API request failed." };
  }
}

/** Batch-loads a normalized detail record for every unique object a slot currently points at, so
 * the canvas can render real approval/freshness/quality status chips and the slide inspector needs
 * zero further client round-trips. Every fetch is individually wrapped so one broken reference
 * (e.g. a version that was since deleted) degrades to an honest "detail unavailable" for that one
 * chip instead of failing the whole page. */
async function loadObjectDetails(refs: ObjectRef[], preloadedBlocks: ContentBlockVersionDetail[]): Promise<Record<string, SlotObjectDetail>> {
  const blocksById = new Map(preloadedBlocks.map((block) => [block.id, block]));
  const entries = await Promise.all(
    refs.map(async (ref) => {
      try {
        const detail = await loadOneObjectDetail(ref, blocksById);
        return [objectDetailKey(ref.type, ref.id), detail] as const;
      } catch {
        return [objectDetailKey(ref.type, ref.id), null] as const;
      }
    })
  );
  const record: Record<string, SlotObjectDetail> = {};
  for (const [key, detail] of entries) {
    if (detail) record[key] = detail;
  }
  return record;
}

async function loadOneObjectDetail(ref: ObjectRef, blocksById: Map<string, ContentBlockVersionDetail>): Promise<SlotObjectDetail> {
  if (ref.type === "content_unit_version") {
    const [version, whereUsed] = await Promise.all([boxbrainApi.getContentUnitVersion(ref.id), safeListWhereUsed(ref.id)]);
    return {
      kind: "content_unit_version",
      href: `/content-units/${ref.id}`,
      summary: version.summary ?? null,
      approvalState: version.approvalState,
      freshnessState: version.freshnessState,
      qualityScore: version.qualityScore ?? null,
      usageScore: version.usageScore ?? null,
      speakerNotes: version.speakerNotes ?? null,
      extractedText: version.extractedText ?? null,
      provenance: version.provenance,
      comments: version.comments ?? [],
      notes: version.notes ?? [],
      whereUsed,
      createdAt: version.createdAt,
      versionNumber: version.versionNumber,
      variantId: version.variantId
    };
  }

  if (ref.type === "content_block_version") {
    const preloaded = blocksById.get(ref.id);
    const block = preloaded ?? (await boxbrainApi.getContentBlock(ref.id));
    const [comments, notes] = await Promise.all([safeListComments2("content_block_version", ref.id), safeListNotes("content_block_version", ref.id)]);
    return {
      kind: "content_block_version",
      href: `/content-blocks/${ref.id}`,
      displayTitle: block.title,
      summary: block.summary ?? null,
      approvalState: block.approvalState,
      comments,
      notes,
      whereUsed: [],
      createdAt: block.createdAt,
      blockType: block.blockType,
      memberCount: block.members.length
    };
  }

  const [workProduct, comments, notes] = await Promise.all([
    boxbrainApi.getWorkProductVersion(ref.id),
    safeListComments2("work_product_version", ref.id),
    safeListNotes("work_product_version", ref.id)
  ]);
  return {
    kind: "work_product_version",
    href: `/work-products/${ref.id}`,
    displayTitle: workProduct.title,
    approvalState: workProduct.approvalState,
    comments,
    notes,
    whereUsed: [],
    createdAt: typeof workProduct.createdAt === "string" ? workProduct.createdAt : undefined,
    versionNumber: workProduct.versionNumber,
    artifactType: workProduct.artifactType
  };
}

async function safeListStoryboards() {
  try {
    return await boxbrainApi.listStoryboards();
  } catch {
    return { items: [], nextCursor: null };
  }
}

async function safeListSnapshots(storyboardId: string) {
  try {
    return await boxbrainApi.listStoryboardSnapshots(storyboardId);
  } catch {
    return [];
  }
}

async function safeGetSnapshot(snapshotId: string) {
  try {
    return await boxbrainApi.getStoryboardSnapshot(snapshotId);
  } catch {
    return undefined;
  }
}

async function safeAnalyze(storyboardId: string): Promise<StoryboardDiagnostics> {
  try {
    return await boxbrainApi.analyzeStoryboard(storyboardId);
  } catch {
    return { narrativeScore: null, warnings: [] };
  }
}

async function safeListComments(storyboardId: string) {
  try {
    return await boxbrainApi.listComments("storyboard", storyboardId);
  } catch {
    return [];
  }
}

async function safeListComments2(targetType: string, targetId: string) {
  try {
    return await boxbrainApi.listComments(targetType, targetId);
  } catch {
    return [];
  }
}

async function safeListNotes(targetType: string, targetId: string) {
  try {
    return await boxbrainApi.listNotes(targetType, targetId);
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

async function safeListContentBlocks() {
  try {
    return await boxbrainApi.listContentBlocks();
  } catch {
    return { items: [], nextCursor: null };
  }
}

function StoryboardNotFound({ id, storyboards }: { id: string; storyboards: Storyboard[] }) {
  return (
    <div className="route-body" data-testid="storyboard-not-found">
      <PageHeader eyebrow="Storyboard" title="Storyboard not found" description={`No visible Storyboard was returned for ${id}.`} />
      <div className="two-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <GitBranchPlus size={16} aria-hidden="true" /> Create Storyboard
          </div>
          <form action={createStoryboardAction} className="grid gap-3">
            <input name="title" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Storyboard title" required />
            <select name="mode" className="rounded-lg border border-slate-200 bg-white p-2 text-sm" defaultValue="work_product">
              <option value="work_product">Work product</option>
              <option value="play">Play</option>
              <option value="opportunity">Opportunity</option>
            </select>
            <Button variant="primary" type="submit">
              <Plus size={14} aria-hidden="true" /> Create
            </Button>
          </form>
        </Card>
        <Card className="p-4">
          <h2 className="m-0 mb-3 text-sm font-bold">Visible Storyboards</h2>
          <div className="grid gap-2">
            {storyboards.length === 0 ? (
              <p className="m-0 text-sm text-slate-500">No Storyboards are visible to this user.</p>
            ) : (
              storyboards.map((storyboard) => (
                <Link key={storyboard.id} href={`/storyboards/${storyboard.id}`} className="rounded-lg border border-slate-200 p-2 text-sm font-semibold hover:bg-slate-50">
                  {storyboard.title}
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StoryboardError({ message }: { message: string }) {
  return (
    <div className="route-body" data-testid="storyboard-error">
      <PageHeader eyebrow="Storyboard" title="Storyboard request failed" description="The live Storyboard API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">API error</div>
            <p className="m-0 mt-1 text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedStoryboard() {
  return (
    <div className="route-body" data-testid="storyboard-restricted">
      <PageHeader eyebrow="Storyboard" title="Restricted Storyboard" description="The current user cannot access this composition workspace." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No sections, slots, comments, snapshots, previews, or diagnostics are shown for restricted Storyboards.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
