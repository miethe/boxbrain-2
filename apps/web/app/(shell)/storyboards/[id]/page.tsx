import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, AlertTriangle, Camera, GitBranchPlus, MessageSquarePlus, PackageCheck, Plus, Replace, Sparkles } from "lucide-react";
import {
  ApiError,
  boxbrainApi,
  type Comment,
  type ContentBlockVersionDetail,
  type Storyboard,
  type StoryboardDetail,
  type StoryboardDiagnostics,
  type StoryboardSection,
  type StoryboardSlot,
  type StoryboardSlotType,
  type StoryboardSnapshot
} from "@/lib/api";
import { Button, Card, EmptyState, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type StoryboardLoadResult =
  | {
      status: "ok";
      storyboard: StoryboardDetail;
      snapshots: StoryboardSnapshot[];
      selectedSnapshot?: StoryboardSnapshot;
      diagnostics: StoryboardDiagnostics;
      comments: Comment[];
      contentBlocks: ContentBlockVersionDetail[];
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

  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Storyboard workspace"
        title={result.storyboard.title}
        description="API-backed composition workspace with sections, slots, diagnostics, anchored comments, and immutable snapshots."
        actions={
          <>
            <form action={createSnapshotAction} className="flex gap-2">
              <input type="hidden" name="storyboardId" value={result.storyboard.id} />
              <input name="versionLabel" className="w-32 rounded-lg border border-slate-200 px-2 text-sm" placeholder="v1" />
              <Button type="submit">
                <Camera size={14} /> Save snapshot
              </Button>
            </form>
            <Link className="btn btn-primary" href="/publish">
              <PackageCheck size={14} /> Publish review
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1.4fr)_360px]">
        <LibraryTray contentBlocks={result.contentBlocks} />

        <div className="grid content-start gap-4">
          <CreateSectionForm storyboardId={result.storyboard.id} nextOrderIndex={result.storyboard.draftSections.length} />
          {result.storyboard.draftSections.length === 0 ? (
            <EmptyState
              title="No draft sections"
              body="The Storyboard API is reachable, but this storyboard has no editable draft sections yet."
            />
          ) : (
            result.storyboard.draftSections.map((section, sectionIndex) => (
              <StoryboardSectionCard
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                storyboardId={result.storyboard.id}
                comments={result.comments}
              />
            ))
          )}
        </div>

        <div className="grid content-start gap-4">
          <DiagnosticsPanel diagnostics={result.diagnostics} />
          <SnapshotPanel storyboard={result.storyboard} snapshots={result.snapshots} selectedSnapshot={result.selectedSnapshot} />
          <StoryboardCommentForm storyboardId={result.storyboard.id} sections={result.storyboard.draftSections} />
          <CommentList comments={result.comments} />
        </div>
      </div>
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
    return {
      status: "ok",
      storyboard,
      snapshots,
      selectedSnapshot,
      diagnostics,
      comments,
      contentBlocks: contentBlockEnvelope.items ?? []
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

async function safeListContentBlocks() {
  try {
    return await boxbrainApi.listContentBlocks();
  } catch {
    return { items: [], nextCursor: null };
  }
}

async function createStoryboardAction(formData: FormData) {
  "use server";

  const storyboard = await boxbrainApi.createStoryboard({
    title: requiredFormValue(formData, "title"),
    mode: (optionalFormValue(formData, "mode") ?? "work_product") as "work_product" | "play" | "opportunity"
  });
  redirect(`/storyboards/${storyboard.id}`);
}

async function createSectionAction(formData: FormData) {
  "use server";

  const storyboardId = requiredFormValue(formData, "storyboardId");
  await boxbrainApi.createStoryboardSection(storyboardId, {
    title: requiredFormValue(formData, "title"),
    summary: optionalFormValue(formData, "summary"),
    orderIndex: optionalNumberValue(formData, "orderIndex")
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}

async function createSlotAction(formData: FormData) {
  "use server";

  const storyboardId = requiredFormValue(formData, "storyboardId");
  const sectionId = requiredFormValue(formData, "sectionId");
  const selectedObjectType = optionalFormValue(formData, "selectedObjectType");
  const selectedObjectId = optionalFormValue(formData, "selectedObjectId");
  const slotType = selectedObjectType && selectedObjectId ? slotTypeForSelectedObject(selectedObjectType) : "gap";

  await boxbrainApi.createStoryboardSlot(sectionId, {
    slotType,
    selectedObjectType: slotType === "gap" ? null : selectedObjectType,
    selectedObjectId: slotType === "gap" ? null : selectedObjectId,
    purpose: optionalFormValue(formData, "purpose"),
    isRequired: formData.get("isRequired") !== "off"
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}

async function swapSlotAction(formData: FormData) {
  "use server";

  const storyboardId = requiredFormValue(formData, "storyboardId");
  const selectedObjectType = requiredFormValue(formData, "selectedObjectType");
  await boxbrainApi.updateStoryboardSlot(requiredFormValue(formData, "slotId"), {
    slotType: slotTypeForSelectedObject(selectedObjectType),
    selectedObjectType,
    selectedObjectId: requiredFormValue(formData, "selectedObjectId"),
    purpose: optionalFormValue(formData, "purpose") ?? undefined
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}

async function createSnapshotAction(formData: FormData) {
  "use server";

  const storyboardId = requiredFormValue(formData, "storyboardId");
  const snapshot = await boxbrainApi.createStoryboardSnapshot(storyboardId, optionalFormValue(formData, "versionLabel"));
  revalidatePath(`/storyboards/${storyboardId}`);
  redirect(`/storyboards/${storyboardId}?snapshotId=${snapshot.id}`);
}

async function createAnchoredCommentAction(formData: FormData) {
  "use server";

  const storyboardId = requiredFormValue(formData, "storyboardId");
  const [sectionId, slotId] = (optionalFormValue(formData, "targetAnchor") ?? "|").split("|");
  await boxbrainApi.createComment({
    kind: "persistent_comment",
    targetType: "storyboard",
    targetId: storyboardId,
    body: requiredFormValue(formData, "body"),
    anchor: {
      sectionId: sectionId || null,
      slotId: slotId || null,
      snapshotId: optionalFormValue(formData, "snapshotId")
    }
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}

function LibraryTray({ contentBlocks }: { contentBlocks: ContentBlockVersionDetail[] }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="m-0 text-sm font-bold">Block tray</h2>
        <StatusBadge tone="ai">api</StatusBadge>
      </div>
      <div className="grid gap-3">
        {contentBlocks.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">No visible ContentBlocks returned.</p>
        ) : (
          contentBlocks.map((block) => (
            <Link key={block.id} href={`/content-blocks/${block.id}`} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <SlideThumb title={block.title} variant="light" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="truncate text-xs font-bold">{block.title}</div>
                <Tag>{block.members.length} units</Tag>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function CreateSectionForm({ storyboardId, nextOrderIndex }: { storyboardId: string; nextOrderIndex: number }) {
  return (
    <Card className="p-4">
      <form action={createSectionAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_86px_auto]">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <input name="title" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Section title" required />
        <input name="summary" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Section summary" />
        <input name="orderIndex" type="number" className="rounded-lg border border-slate-200 p-2 text-sm" defaultValue={nextOrderIndex} />
        <Button type="submit">
          <Plus size={14} /> Section
        </Button>
      </form>
    </Card>
  );
}

function StoryboardSectionCard({
  section,
  sectionIndex,
  storyboardId,
  comments
}: {
  section: StoryboardSection;
  sectionIndex: number;
  storyboardId: string;
  comments: Comment[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.07em] text-slate-500">Section {sectionIndex + 1}</div>
            <h2 className="m-0 text-base font-bold">{section.title}</h2>
            <p className="m-0 text-sm text-slate-500">{section.summary ?? "No section summary returned."}</p>
          </div>
          <Tag>{section.slots.length} slots</Tag>
        </div>
        <CreateSlotForm storyboardId={storyboardId} sectionId={section.id} />
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {section.slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No slots in this section.</div>
        ) : (
          section.slots.map((slot) => <SlotCard key={slot.id} slot={slot} storyboardId={storyboardId} comments={comments} />)
        )}
      </div>
    </Card>
  );
}

function CreateSlotForm({ storyboardId, sectionId }: { storyboardId: string; sectionId: string }) {
  return (
    <form action={createSlotAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_170px_1fr_auto]">
      <input type="hidden" name="storyboardId" value={storyboardId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input name="purpose" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Slot purpose" />
      <select name="selectedObjectType" className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
        <option value="">Gap</option>
        <option value="content_unit_version">ContentUnit version</option>
        <option value="content_block_version">ContentBlock version</option>
        <option value="work_product_version">WorkProduct version</option>
      </select>
      <input name="selectedObjectId" className="rounded-lg border border-slate-200 p-2 font-mono text-xs" placeholder="Selected object UUID" />
      <Button type="submit">
        <Plus size={14} /> Slot
      </Button>
    </form>
  );
}

function SlotCard({ slot, storyboardId, comments }: { slot: StoryboardSlot; storyboardId: string; comments: Comment[] }) {
  const slotComments = comments.filter((comment) => anchorValue(comment, "slotId") === slot.id);
  const isGap = slot.slotType === "gap" || !slot.selectedObjectId;

  return (
    <div className={`rounded-lg border p-3 ${isGap ? "border-dashed border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold">{slot.purpose ?? "Untitled slot"}</div>
          <div className="text-xs text-slate-500">Order {slot.orderIndex + 1}</div>
        </div>
        {isGap ? <Tag tone="warn">gap</Tag> : <StatusBadge tone="ok">{slot.slotType}</StatusBadge>}
      </div>
      {isGap ? (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-amber-300 bg-white/70 text-center text-sm font-semibold text-amber-700">
          Recommendation needed
        </div>
      ) : (
        <Link href={selectedObjectHref(slot)} className="block">
          <SlideThumb title={slot.selectedObjectType ?? "Selected object"} variant={slot.slotType === "content_block" ? "teal" : "light"} />
          <div className="mt-2 truncate font-mono text-xs text-slate-500">{slot.selectedObjectId}</div>
        </Link>
      )}
      <form action={swapSlotAction} className="mt-3 grid gap-2">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <input type="hidden" name="slotId" value={slot.id} />
        <select name="selectedObjectType" className="rounded-lg border border-slate-200 bg-white p-2 text-sm" defaultValue={slot.selectedObjectType ?? "content_unit_version"}>
          <option value="content_unit_version">ContentUnit version</option>
          <option value="content_block_version">ContentBlock version</option>
          <option value="work_product_version">WorkProduct version</option>
        </select>
        <input name="selectedObjectId" className="rounded-lg border border-slate-200 p-2 font-mono text-xs" placeholder="Swap to object UUID" required />
        <input name="purpose" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Updated purpose" defaultValue={slot.purpose ?? ""} />
        <Button type="submit">
          <Replace size={14} /> Swap
        </Button>
      </form>
      {slotComments.length > 0 && (
        <div className="mt-3 grid gap-2">
          {slotComments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-blue-50 p-2 text-xs text-blue-950">{comment.body}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: StoryboardDiagnostics }) {
  const score = diagnostics.narrativeScore == null ? null : Math.round(diagnostics.narrativeScore * 100);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <AlertTriangle size={16} color="var(--warn)" /> Diagnostics
      </div>
      <div className="mb-3">{score == null ? <Tag>not scored</Tag> : <StatusBadge tone={score >= 80 ? "ok" : "warn"}>{score} narrative</StatusBadge>}</div>
      <div className="grid gap-2 text-sm">
        {diagnostics.warnings.length === 0 ? (
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">No diagnostics warnings returned.</div>
        ) : (
          diagnostics.warnings.map((warning) => (
            <div key={`${warning.code}-${warning.targetId ?? warning.message}`} className={`rounded-lg p-3 ${warning.severity === "critical" ? "bg-red-50 text-red-800" : warning.severity === "warning" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
              <div className="font-bold">{warning.code}</div>
              <div>{warning.message}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function SnapshotPanel({
  storyboard,
  snapshots,
  selectedSnapshot
}: {
  storyboard: StoryboardDetail;
  snapshots: StoryboardSnapshot[];
  selectedSnapshot?: StoryboardSnapshot;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Camera size={16} /> Snapshot history
      </div>
      {snapshots.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No immutable snapshots have been saved.</p>
      ) : (
        <div className="grid gap-2">
          {snapshots.map((snapshot) => (
            <Link key={snapshot.id} href={`/storyboards/${storyboard.id}?snapshotId=${snapshot.id}`} className="rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
              <div className="font-bold">{snapshot.versionLabel ?? snapshot.id.slice(0, 8)}</div>
              <div className="text-xs text-slate-500">{formatDate(snapshot.createdAt)} · {snapshot.sections.length} sections</div>
            </Link>
          ))}
        </div>
      )}
      {selectedSnapshot && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-sm font-bold">Snapshot detail</div>
          <div className="grid gap-2 text-xs text-slate-600">
            <div>{selectedSnapshot.versionLabel ?? selectedSnapshot.id}</div>
            <div>{selectedSnapshot.sections.length} frozen sections · {selectedSnapshot.sections.flatMap((section) => section.slots).length} frozen slots</div>
            <div>Approval: {selectedSnapshot.approvalState}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

function StoryboardCommentForm({ storyboardId, sections }: { storyboardId: string; sections: StoryboardSection[] }) {
  const slotOptions = sections.flatMap((section) =>
    section.slots.map((slot) => ({
      sectionId: section.id,
      label: `${section.title} / ${slot.purpose ?? slot.id.slice(0, 8)}`,
      slotId: slot.id
    }))
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <MessageSquarePlus size={16} color="var(--ai)" /> Anchored comment
      </div>
      <form action={createAnchoredCommentAction} className="grid gap-3">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <select name="targetAnchor" className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
          <option value="|">Storyboard-level</option>
          {slotOptions.map((option) => (
            <option key={option.slotId} value={`${option.sectionId}|${option.slotId}`}>
              {option.label}
            </option>
          ))}
        </select>
        <textarea name="body" className="min-h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" placeholder="Comment" required />
        <Button variant="primary" type="submit">
          <Sparkles size={14} /> Add comment
        </Button>
      </form>
    </Card>
  );
}

function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <Card className="p-4">
      <h2 className="m-0 mb-3 text-sm font-bold">Comments</h2>
      {comments.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No storyboard comments returned.</p>
      ) : (
        <div className="grid gap-2">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-blue-50 p-3 text-blue-950">
              <div className="text-xs font-bold uppercase text-blue-700">{anchorLabel(comment)}</div>
              <div className="text-sm">{comment.body}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StoryboardNotFound({ id, storyboards }: { id: string; storyboards: Storyboard[] }) {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Storyboard" title="Storyboard not found" description={`No visible Storyboard was returned for ${id}.`} />
      <div className="two-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <GitBranchPlus size={16} /> Create Storyboard
          </div>
          <form action={createStoryboardAction} className="grid gap-3">
            <input name="title" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Storyboard title" required />
            <select name="mode" className="rounded-lg border border-slate-200 bg-white p-2 text-sm" defaultValue="work_product">
              <option value="work_product">Work product</option>
              <option value="play">Play</option>
              <option value="opportunity">Opportunity</option>
            </select>
            <Button variant="primary" type="submit">
              <Plus size={14} /> Create
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
    <div className="route-body">
      <PageHeader eyebrow="Storyboard" title="Storyboard request failed" description="The live Storyboard API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
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
    <div className="route-body">
      <PageHeader eyebrow="Storyboard" title="Restricted Storyboard" description="The current user cannot access this composition workspace." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No sections, slots, comments, snapshots, previews, or diagnostics are shown for restricted Storyboards.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function selectedObjectHref(slot: StoryboardSlot) {
  if (slot.selectedObjectType === "content_block_version") return `/content-blocks/${slot.selectedObjectId}`;
  if (slot.selectedObjectType === "content_unit_version") return `/content-units/${slot.selectedObjectId}`;
  return `/work-products/${slot.selectedObjectId}`;
}

function slotTypeForSelectedObject(selectedObjectType: string | null): StoryboardSlotType {
  if (selectedObjectType === "content_block_version") return "content_block";
  if (selectedObjectType === "work_product_version") return "work_product_ref";
  if (selectedObjectType === "content_unit_version") return "content_unit";
  return "gap";
}

function anchorValue(comment: Comment, key: string) {
  const value = comment.anchor?.[key];
  return typeof value === "string" ? value : null;
}

function anchorLabel(comment: Comment) {
  const slotId = anchorValue(comment, "slotId");
  if (slotId) return `slot ${slotId.slice(0, 8)}`;
  const sectionId = anchorValue(comment, "sectionId");
  if (sectionId) return `section ${sectionId.slice(0, 8)}`;
  return "storyboard";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function optionalNumberValue(formData: FormData, field: string) {
  const value = optionalFormValue(formData, field);
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredFormValue(formData: FormData, field: string) {
  const value = optionalFormValue(formData, field);
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

function optionalFormValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
