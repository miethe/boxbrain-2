import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AlertCircle, CheckCircle2, GitBranch, History, MessageSquare, MessageSquarePlus, Network, NotebookPen, RefreshCw, ShieldCheck, Star } from "lucide-react";
import {
  ApiError,
  API_BASE_URL,
  boxbrainApi,
  type ApprovalState,
  type Comment,
  type ContentUnitFamilyDetail,
  type ContentUnitVariant,
  type ContentUnitVersion,
  type ContentUnitVersionDetail,
  type ContentUnitWhereUsedReference,
  type FreshnessState,
  type Note,
  type SearchResultItem,
  type StatusChips,
  type Taxonomy
} from "@/lib/api";
import { Button, Card, Meter, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type VersionGroup = {
  variant: ContentUnitVariant;
  versions: ContentUnitVersion[];
};

type AncillaryData = {
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  comments: Comment[];
  notes: Note[];
};

type ContentUnitPageModel =
  | {
      source: "family";
      family: ContentUnitFamilyDetail;
      versionGroups: VersionGroup[];
      selectedVersion?: ContentUnitVersionDetail;
      ancillary: AncillaryData;
    }
  | {
      source: "version";
      version: ContentUnitVersionDetail;
      ancillary: AncillaryData;
    };

type ContentUnitLoadResult =
  | {
      status: "ok";
      model: ContentUnitPageModel;
    }
  | {
      status: "restricted";
    }
  | {
      status: "not_found";
    }
  | {
      status: "error";
      message: string;
    };

export default async function ContentUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadContentUnit(id);

  if (result.status === "restricted") {
    return <RestrictedContentUnit />;
  }

  if (result.status === "not_found") {
    return <NotFoundContentUnit id={id} />;
  }

  if (result.status === "error") {
    return <ContentUnitError message={result.message} />;
  }

  return result.model.source === "family" ? <FamilyDetail model={result.model} pageId={id} /> : <VersionDetail model={result.model} pageId={id} />;
}

async function loadContentUnit(id: string): Promise<ContentUnitLoadResult> {
  try {
    const family = await boxbrainApi.getContentUnitFamily(id);
    return { status: "ok", model: await buildFamilyModel(family) };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }

    if (error instanceof ApiError && error.status !== 404) {
      return { status: "error", message: error.message };
    }
  }

  try {
    const version = await boxbrainApi.getContentUnitVersion(id);
    return {
      status: "ok",
      model: {
        source: "version",
        version,
        ancillary: await loadVersionAncillary(version)
      }
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not_found" };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The ContentUnit API request failed." };
  }
}

async function buildFamilyModel(family: ContentUnitFamilyDetail): Promise<ContentUnitPageModel> {
  const variants = family.variants?.length ? family.variants : (await boxbrainApi.listContentUnitVariants(family.id)).items;
  const versionGroups = await Promise.all(
    variants.map(async (variant) => ({
      variant,
      versions: (await boxbrainApi.listContentUnitVersions(variant.id)).items
    }))
  );
  const selectedVersionId = selectVersionId(variants, versionGroups);
  const selectedVersion = selectedVersionId ? await boxbrainApi.getContentUnitVersion(selectedVersionId) : undefined;

  return {
    source: "family",
    family,
    versionGroups,
    selectedVersion,
    ancillary: selectedVersion ? await loadVersionAncillary(selectedVersion) : emptyAncillary()
  };
}

async function loadVersionAncillary(version: ContentUnitVersionDetail): Promise<AncillaryData> {
  const [similar, whereUsed, comments, notes] = await Promise.all([
    boxbrainApi.listSimilarContentUnits(version.id),
    boxbrainApi.listContentUnitWhereUsed(version.id),
    boxbrainApi.listComments("content_unit_version", version.id),
    boxbrainApi.listNotes("content_unit_version", version.id)
  ]);

  return {
    similar,
    whereUsed,
    comments: comments.length ? comments : version.comments ?? [],
    notes: notes.length ? notes : version.notes ?? []
  };
}

async function createPersistentCommentAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  const body = requiredFormValue(formData, "body");
  await boxbrainApi.createComment({
    kind: "persistent_comment",
    targetType: "content_unit_version",
    targetId: versionId,
    body
  });
  revalidateContentUnitPaths(pageId, versionId);
}

async function createNoteAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  await boxbrainApi.createNote({
    targetType: "content_unit_version",
    targetId: versionId,
    title: optionalFormValue(formData, "title"),
    body: requiredFormValue(formData, "body"),
    noteType: optionalFormValue(formData, "noteType") ?? "usage_guidance",
    isPinned: formData.get("isPinned") === "on"
  });
  revalidateContentUnitPaths(pageId, versionId);
}

async function setCanonicalVariantAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = optionalFormValue(formData, "versionId");
  await boxbrainApi.setContentUnitCanonicalVariant(requiredFormValue(formData, "variantId"), optionalFormValue(formData, "reason"));
  revalidateContentUnitPaths(pageId, versionId);
}

async function updateApprovalAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  await boxbrainApi.updateContentUnitApproval(versionId, requiredFormValue(formData, "approvalState") as ApprovalState, optionalFormValue(formData, "notes"));
  revalidateContentUnitPaths(pageId, versionId);
}

async function updateFreshnessAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  await boxbrainApi.updateContentUnitFreshness(versionId, requiredFormValue(formData, "freshnessState") as FreshnessState, optionalFormValue(formData, "notes"));
  revalidateContentUnitPaths(pageId, versionId);
}

function revalidateContentUnitPaths(pageId: string, versionId?: string | null) {
  revalidatePath(`/content-units/${pageId}`);
  if (versionId && versionId !== pageId) revalidatePath(`/content-units/${versionId}`);
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

function FamilyDetail({ model, pageId }: { model: Extract<ContentUnitPageModel, { source: "family" }>; pageId: string }) {
  const canonicalVariant = model.versionGroups.find((group) => group.variant.isCanonical)?.variant ?? model.versionGroups[0]?.variant;
  const version = model.selectedVersion;
  const tags = taxonomyTags(model.family.taxonomy);
  const status = versionStatus(model.family.statusChips, version);
  const variantOptions = model.versionGroups.map((group) => group.variant);

  return (
    <div className="route-body">
      <PageHeader
        eyebrow="ContentUnit family"
        title={model.family.familyTitle}
        description={model.family.conceptualSummary ?? version?.summary ?? "Live ContentUnit family detail from the governed catalog API."}
        actions={
          <>
            <Link className="btn" href="/variation-explorer">
              <Network size={14} /> Variation explorer
            </Link>
            <Button variant="primary">Add to storyboard</Button>
          </>
        }
      />

      <div className="two-col">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
              <ContentUnitPreview title={model.family.familyTitle} previewUri={version?.thumbnailUri ?? version?.renderUri ?? model.family.canonicalPreviewUri} />
              <div>
                <StatusRow status={status} />
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <Metric label="Canonical variant" value={canonicalVariant?.variantLabel ?? "Not set"} />
                  <Metric label="Latest version" value={version?.versionNumber ?? canonicalVariant?.latestVersion?.versionNumber ?? "None"} />
                  <Metric label="Where used" value={`${model.ancillary.whereUsed.length} references`} />
                  <Metric label="Similarity links" value={`${model.ancillary.similar.length} related`} />
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">{tags.length === 0 ? <Tag>untagged</Tag> : tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="tabs">
              <div className="tab active">Overview</div>
              <div className="tab">Variants</div>
              <div className="tab">Versions</div>
              <div className="tab">Provenance</div>
              <div className="tab">Comments</div>
              <div className="tab">Notes</div>
              <div className="tab">Where-used</div>
            </div>
            <VariantGrid groups={model.versionGroups} />
          </Card>
        </div>

        <SideRail pageId={pageId} version={version} ancillary={model.ancillary} familyNotes={model.family.notes ?? []} variantOptions={variantOptions} />
      </div>
    </div>
  );
}

function VersionDetail({ model, pageId }: { model: Extract<ContentUnitPageModel, { source: "version" }>; pageId: string }) {
  const version = model.version;

  return (
    <div className="route-body">
      <PageHeader
        eyebrow="ContentUnit version"
        title={version.summary ?? `ContentUnit ${version.versionNumber}`}
        description={version.extractedText ?? version.speakerNotes ?? "Live ContentUnit version detail from the governed catalog API."}
        actions={
          <>
            <Link className="btn" href="/variation-explorer">
              <Network size={14} /> Variation explorer
            </Link>
            <Button variant="primary">Add to storyboard</Button>
          </>
        }
      />

      <div className="two-col">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
              <ContentUnitPreview title={version.summary ?? version.id} previewUri={version.thumbnailUri ?? version.renderUri} />
              <div>
                <StatusRow status={versionStatus(undefined, version)} />
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <Metric label="Variant" value={version.variantId} />
                  <Metric label="Version" value={version.versionNumber} />
                  <Metric label="Where used" value={`${model.ancillary.whereUsed.length} references`} />
                  <Metric label="Similarity links" value={`${model.ancillary.similar.length} related`} />
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="m-0 text-base font-bold">Extracted content</h2>
            <div className="mt-3 grid gap-3 text-sm text-slate-600">
              <TextPanel title="Extracted text" body={version.extractedText} empty="No extracted text returned." />
              <TextPanel title="Speaker notes" body={version.speakerNotes} empty="No speaker notes returned." />
            </div>
          </Card>
        </div>

        <SideRail pageId={pageId} version={version} ancillary={model.ancillary} familyNotes={[]} variantOptions={[]} />
      </div>
    </div>
  );
}

function VariantGrid({ groups }: { groups: VersionGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm font-bold text-slate-800">No variants returned</div>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">The family exists, but the API did not return variant or version membership.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-3">
      {groups.map(({ variant, versions }, index) => {
        const latest = versions[0] ?? variant.latestVersion;
        return (
          <div key={variant.id} className="rounded-lg border border-slate-200 p-3">
            <ContentUnitPreview title={`${variant.variantLabel} variant`} previewUri={latest?.thumbnailUri ?? latest?.renderUri} fallbackVariant={index % 2 === 0 ? "light" : "teal"} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm font-bold">{variant.variantLabel}</div>
              {variant.isCanonical && <StatusBadge tone="ok">canonical</StatusBadge>}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Latest {latest?.versionNumber ?? "not returned"} · {versions.length} versions · {variant.linkedBy ?? "manual"}
            </div>
            {versions.length > 0 && (
              <div className="mt-3 grid gap-2">
                {versions.slice(0, 4).map((version) => (
                  <Link key={version.id} href={`/content-units/${version.id}`} className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    {version.versionNumber} · {version.approvalState}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SideRail({
  pageId,
  version,
  ancillary,
  familyNotes,
  variantOptions
}: {
  pageId: string;
  version?: ContentUnitVersionDetail;
  ancillary: AncillaryData;
  familyNotes: Note[];
  variantOptions: ContentUnitVariant[];
}) {
  const allNotes = [...familyNotes, ...ancillary.notes];
  const currentVariant = variantOptions.find((variant) => variant.id === version?.variantId);

  return (
    <div className="grid content-start gap-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} color="var(--ok)" /> Governance
        </div>
        <Meter value={qualityScore(version)} label="quality score" />
        {version ? (
          <div className="mt-4 grid gap-3">
            <form action={updateApprovalAction} className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <FormIds pageId={pageId} versionId={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                Approval
                <select name="approvalState" defaultValue={version.approvalState} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold normal-case text-slate-800">
                  {approvalOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <input name="notes" className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" placeholder="Decision note" />
              <Button type="submit" className="justify-center">
                <CheckCircle2 size={14} /> Update approval
              </Button>
            </form>

            <form action={updateFreshnessAction} className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <FormIds pageId={pageId} versionId={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                Freshness
                <select name="freshnessState" defaultValue={version.freshnessState ?? "aging"} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold normal-case text-slate-800">
                  {freshnessOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <input name="notes" className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" placeholder="Freshness note" />
              <Button type="submit" className="justify-center">
                <RefreshCw size={14} /> Update freshness
              </Button>
            </form>

            <form action={setCanonicalVariantAction} className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <FormIds pageId={pageId} versionId={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                Canonical variant
                {variantOptions.length > 0 ? (
                  <select name="variantId" defaultValue={currentVariant?.id ?? version.variantId} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold normal-case text-slate-800">
                    {variantOptions.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.variantLabel}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="variantId" value={version.variantId} />
                    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm normal-case text-slate-700">{version.variantId}</div>
                  </>
                )}
              </label>
              <input name="reason" className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" placeholder="Canonical reason" />
              <Button type="submit" className="justify-center">
                <Star size={14} /> Set canonical
              </Button>
            </form>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-500">No version is selected, so write controls are unavailable.</div>
        )}
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <GitBranch size={16} color="var(--primary)" /> Provenance
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {version?.provenance ? provenanceText(version.provenance) : "No version provenance returned."}
        </div>
        <div className="mt-3 text-xs text-slate-500">Major versions require provenance records. AI suggestions remain reviewable candidates.</div>
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <History size={16} /> Where used
        </div>
        <ReferenceList items={ancillary.whereUsed} empty="No usage references returned." />
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Network size={16} /> Similar content
        </div>
        <SimilarList items={ancillary.similar} />
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <MessageSquare size={16} /> Comments and notes
        </div>
        {version && <CommentNoteForms pageId={pageId} versionId={version.id} />}
        <CommentNoteList comments={ancillary.comments} notes={allNotes} />
      </Card>
    </div>
  );
}

const approvalOptions: ApprovalState[] = ["draft", "review", "approved", "deprecated", "archived"];
const freshnessOptions: FreshnessState[] = ["fresh", "aging", "stale"];
const noteTypeOptions = ["usage_guidance", "review_note", "migration_note"];

function FormIds({ pageId, versionId }: { pageId: string; versionId: string }) {
  return (
    <>
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="versionId" value={versionId} />
    </>
  );
}

function CommentNoteForms({ pageId, versionId }: { pageId: string; versionId: string }) {
  return (
    <div className="mb-3 grid gap-3">
      <form action={createPersistentCommentAction} className="grid gap-2 rounded-lg border border-slate-200 p-3">
        <FormIds pageId={pageId} versionId={versionId} />
        <textarea
          name="body"
          required
          rows={2}
          className="min-h-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          placeholder="Persistent comment"
        />
        <Button type="submit" className="justify-center">
          <MessageSquarePlus size={14} /> Add comment
        </Button>
      </form>

      <form action={createNoteAction} className="grid gap-2 rounded-lg border border-slate-200 p-3">
        <FormIds pageId={pageId} versionId={versionId} />
        <input name="title" className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" placeholder="Note title" />
        <textarea name="body" required rows={2} className="min-h-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm" placeholder="Note body" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <select name="noteType" defaultValue="usage_guidance" className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800">
            {noteTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <input type="checkbox" name="isPinned" className="h-4 w-4 rounded border-slate-300" />
            Pin
          </label>
        </div>
        <Button type="submit" className="justify-center">
          <NotebookPen size={14} /> Add note
        </Button>
      </form>
    </div>
  );
}

function StatusRow({ status }: { status: StatusChips }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge tone={approvalTone(status.approvalState)}>{status.approvalState}</StatusBadge>
      <StatusBadge tone={freshnessTone(status.freshnessState)}>{status.freshnessState}</StatusBadge>
      {status.isRestricted && <StatusBadge tone="danger">restricted</StatusBadge>}
      {status.isCanonical && <StatusBadge tone="ok">canonical</StatusBadge>}
      {status.linkSource && <StatusBadge tone={status.linkSource === "ai" ? "ai" : "neutral"}>{status.linkSource}</StatusBadge>}
    </div>
  );
}

function ContentUnitPreview({
  title,
  previewUri,
  fallbackVariant = "dark"
}: {
  title: string;
  previewUri?: string | null;
  fallbackVariant?: "dark" | "light" | "teal" | "purple";
}) {
  if (!previewUri) return <SlideThumb title={title} variant={fallbackVariant} brand="BB" />;
  return (
    <div
      className="slide-thumb light bg-cover bg-center"
      aria-label={`${title} preview`}
      style={{
        backgroundImage: `url("${assetUrl(previewUri)}")`
      }}
    >
      <div className="slide-content bg-white/75">
        <div className="slide-brand">BB</div>
        <div className="slide-title">{title}</div>
      </div>
    </div>
  );
}

function ReferenceList({ items, empty }: { items: ContentUnitWhereUsedReference[]; empty: string }) {
  if (items.length === 0) return <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">{empty}</div>;
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <Link key={`${item.objectType}-${item.objectId}-${item.slotId ?? item.orderIndex ?? ""}`} href={referenceHref(item)} className="block rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
          <div className="font-semibold">{item.title ?? item.objectId}</div>
          <div className="text-xs text-slate-500">{item.objectType}</div>
        </Link>
      ))}
    </div>
  );
}

function SimilarList({ items }: { items: SearchResultItem[] }) {
  if (items.length === 0) return <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">No similarity edges returned.</div>;
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <Link key={item.objectId} href={`/content-units/${item.objectId}`} className="block rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold">{item.title}</span>
            <span className="text-xs font-bold text-slate-500">{Math.round(item.score * 100)}%</span>
          </div>
          <div className="text-xs text-slate-500">{item.explanationChips?.join(" · ") || item.resultGrain}</div>
        </Link>
      ))}
    </div>
  );
}

function CommentNoteList({ comments, notes }: { comments: Comment[]; notes: Note[] }) {
  if (comments.length === 0 && notes.length === 0) {
    return <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">No comments or notes returned.</div>;
  }

  return (
    <div className="grid gap-2 text-sm">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-lg bg-blue-50 p-3 text-blue-950">
          <div className="text-xs font-bold uppercase text-blue-700">{comment.kind}</div>
          {comment.body}
        </div>
      ))}
      {notes.map((note) => (
        <div key={note.id} className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
          <div className="text-xs font-bold uppercase text-emerald-700">{note.title ?? note.noteType}</div>
          {note.body}
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 break-words font-bold">{value}</dd>
    </div>
  );
}

function TextPanel({ title, body, empty }: { title: string; body?: string | null; empty: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="mb-1 text-xs font-bold uppercase text-slate-500">{title}</div>
      <div>{body?.trim() || empty}</div>
    </div>
  );
}

function ContentUnitError({ message }: { message: string }) {
  return (
    <div className="route-body">
      <PageHeader eyebrow="ContentUnit detail" title="ContentUnit unavailable" description="The live ContentUnit API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">ContentUnit request failed</div>
            <p className="m-0 mt-1 text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedContentUnit() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="ContentUnit detail" title="Restricted ContentUnit" description="This ContentUnit is not available to the current user." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No preview, snippets, comments, notes, provenance, similar items, or where-used references are shown for restricted content.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NotFoundContentUnit({ id }: { id: string }) {
  return (
    <div className="route-body">
      <PageHeader eyebrow="ContentUnit detail" title="ContentUnit not found" description="The API did not return a family or version for this identifier." />
      <Card className="p-5 text-sm text-slate-600">Requested identifier: {id}</Card>
    </div>
  );
}

function selectVersionId(variants: ContentUnitVariant[], groups: VersionGroup[]) {
  const canonical = variants.find((variant) => variant.isCanonical) ?? variants[0];
  if (canonical?.latestVersionId) return canonical.latestVersionId;
  if (canonical?.latestVersion?.id) return canonical.latestVersion.id;
  return groups.find((group) => group.versions.length > 0)?.versions[0]?.id;
}

function emptyAncillary(): AncillaryData {
  return { similar: [], whereUsed: [], comments: [], notes: [] };
}

function versionStatus(status?: StatusChips, version?: ContentUnitVersion): StatusChips {
  return {
    approvalState: version?.approvalState ?? status?.approvalState ?? "draft",
    freshnessState: version?.freshnessState ?? status?.freshnessState ?? "aging",
    isCanonical: status?.isCanonical ?? false,
    isRestricted: status?.isRestricted ?? false,
    linkSource: status?.linkSource ?? "manual"
  };
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

function qualityScore(version?: ContentUnitVersion) {
  const raw = version?.qualityScore;
  if (typeof raw !== "number") return 70;
  const normalized = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function provenanceText(provenance: NonNullable<ContentUnitVersionDetail["provenance"]>) {
  const source = provenance.sourceRefs?.length ? provenance.sourceRefs.join(" · ") : provenance.originType;
  const pipeline = provenance.pipelineVersion ? ` · ${provenance.pipelineVersion}` : "";
  return `${source}${pipeline}`;
}

function referenceHref(item: ContentUnitWhereUsedReference) {
  if (item.objectType === "storyboard") return `/storyboards/${item.objectId}`;
  if (item.objectType === "content_block_version") return `/content-blocks/${item.objectId}`;
  if (item.objectType === "work_product_version") return `/work-products/${item.objectId}`;
  return "/library";
}

function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
