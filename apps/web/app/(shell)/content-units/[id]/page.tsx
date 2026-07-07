import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import {
  ApiError,
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
  type ProvenanceRecord,
  type SearchResultItem,
  type Storyboard,
  type WorkProductVersionDetail
} from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import {
  approvalTone,
  buildActivityTimeline,
  findFilmstripPosition,
  flattenVersionGroups,
  normalizeScore,
  primaryParentReference,
  taxonomyTags,
  titleCase,
  versionBadge,
  type ActivityEvent,
  type FlatVersion,
  type SlidePosition,
  type Tone
} from "@/features/content-units/lib";
import { ContentUnitHeaderBlock } from "@/components/content-units/header-block";
import { ContentUnitTabNav, type ContentUnitTabKey, type OverviewPanelKey } from "@/components/content-units/tab-nav";
import { GovernancePanel } from "@/components/content-units/governance-panel";
import { OverviewTab } from "@/components/content-units/overview-tab";
import { VariantsTab } from "@/components/content-units/variants-tab";
import { VersionsTab } from "@/components/content-units/versions-tab";
import { SimilarTab } from "@/components/content-units/similar-tab";
import { CommentsTab } from "@/components/content-units/comments-tab";
import { NotesTab } from "@/components/content-units/notes-tab";
import { ActivityTab } from "@/components/content-units/activity-tab";
import type { CarouselCard } from "@/components/content-units/variant-carousel";

type AncillaryData = {
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  comments: Comment[];
  notes: Note[];
};

type ContentUnitDetailModel = {
  source: "family" | "version";
  pageId: string;
  title: string;
  isCanonical: boolean;
  isApproved: boolean;
  isAiLinked: boolean;
  isRestricted: boolean;
  freshnessState?: FreshnessState;
  version?: ContentUnitVersionDetail;
  currentVariant?: ContentUnitVariant;
  variantOptions: ContentUnitVariant[];
  flatVersions: FlatVersion[];
  hasFamily: boolean;
  summary?: string | null;
  tags: string[];
  provenance?: ProvenanceRecord;
  slidePosition: SlidePosition | null;
  parentTitle?: string | null;
  previewUri?: string | null;
  thumb?: string | null;
  ancillary: AncillaryData;
  storyboards: Storyboard[];
  activityEvents: ActivityEvent[];
};

type ContentUnitLoadResult =
  | { status: "ok"; model: ContentUnitDetailModel }
  | { status: "restricted" }
  | { status: "not_found" }
  | { status: "error"; message: string };

const KNOWN_TABS: ContentUnitTabKey[] = ["overview", "variants", "versions", "similar", "comments", "notes", "activity"];
const KNOWN_PANELS: OverviewPanelKey[] = ["overview", "text", "provenance", "relationships", "activity"];

export default async function ContentUnitPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; panel?: string; version?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const result = await loadContentUnit(id, query.version);

  if (result.status === "restricted") return <RestrictedContentUnit />;
  if (result.status === "not_found") return <NotFoundContentUnit id={id} />;
  if (result.status === "error") return <ContentUnitError message={result.message} />;

  const activeTab = (KNOWN_TABS as string[]).includes(query.tab ?? "") ? (query.tab as ContentUnitTabKey) : "overview";
  const activePanel = (KNOWN_PANELS as string[]).includes(query.panel ?? "") ? (query.panel as OverviewPanelKey) : "overview";

  return <ContentUnitDetailView model={result.model} activeTab={activeTab} activePanel={activePanel} />;
}

async function loadContentUnit(id: string, versionOverride?: string): Promise<ContentUnitLoadResult> {
  try {
    const family = await boxbrainApi.getContentUnitFamily(id);
    return { status: "ok", model: await buildFamilyModel(id, family, versionOverride) };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    if (error instanceof ApiError && error.status !== 404) return { status: "error", message: error.message };
  }

  try {
    const version = await boxbrainApi.getContentUnitVersion(id);
    return { status: "ok", model: await buildVersionOnlyModel(id, version) };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    if (error instanceof ApiError && error.status === 404) return { status: "not_found" };
    return { status: "error", message: error instanceof Error ? error.message : "The ContentUnit API request failed." };
  }
}

async function buildFamilyModel(pageId: string, family: ContentUnitFamilyDetail, versionOverride?: string): Promise<ContentUnitDetailModel> {
  const variants = family.variants?.length ? family.variants : (await boxbrainApi.listContentUnitVariants(family.id)).items;
  const versionGroups = await Promise.all(
    variants.map(async (variant) => ({ variant, versions: (await boxbrainApi.listContentUnitVersions(variant.id)).items }))
  );
  const flatVersions = flattenVersionGroups(versionGroups);

  const defaultVersionId = selectVersionId(variants, versionGroups);
  const requestedVersionId = versionOverride && flatVersions.some((entry) => entry.version.id === versionOverride) ? versionOverride : undefined;
  const selectedVersionId = requestedVersionId ?? defaultVersionId;
  const selectedVersion = selectedVersionId ? await boxbrainApi.getContentUnitVersion(selectedVersionId) : undefined;
  const currentVariant = variants.find((variant) => variant.id === selectedVersion?.variantId);

  const [ancillary, storyboardEnvelope] = await Promise.all([
    selectedVersion ? loadVersionAncillary(selectedVersion) : Promise.resolve(emptyAncillary()),
    safeListStoryboards()
  ]);

  const primaryParentRef = primaryParentReference(ancillary.whereUsed);
  const parentDetail = primaryParentRef?.objectType === "work_product_version" ? await safeGetWorkProductVersion(primaryParentRef.objectId) : undefined;
  const slidePosition = parentDetail && selectedVersion ? findFilmstripPosition(parentDetail.filmstrip, selectedVersion.id) : null;

  const notes = [...(family.notes ?? []), ...ancillary.notes];
  const activityEvents = buildActivityTimeline({ versions: flatVersions, comments: ancillary.comments, notes });

  return {
    source: "family",
    pageId,
    title: selectedVersion?.summary ?? family.familyTitle,
    isCanonical: Boolean(currentVariant?.isCanonical ?? family.statusChips?.isCanonical),
    isApproved: (selectedVersion?.approvalState ?? family.statusChips?.approvalState) === "approved",
    isAiLinked: currentVariant?.linkedBy === "ai" || currentVariant?.linkedBy === "hybrid",
    isRestricted: Boolean(family.statusChips?.isRestricted),
    freshnessState: selectedVersion?.freshnessState ?? family.statusChips?.freshnessState,
    version: selectedVersion,
    currentVariant,
    variantOptions: variants,
    flatVersions,
    hasFamily: variants.length > 0,
    summary: selectedVersion?.summary ?? family.conceptualSummary,
    tags: taxonomyTags(family.taxonomy),
    provenance: selectedVersion?.provenance,
    slidePosition,
    parentTitle: primaryParentRef?.title ?? null,
    previewUri: selectedVersion?.thumbnailUri ?? selectedVersion?.renderUri ?? family.canonicalPreviewUri,
    thumb: selectedVersion?.thumbnailUri ?? family.canonicalPreviewUri,
    ancillary: { ...ancillary, notes },
    storyboards: storyboardEnvelope.items,
    activityEvents
  };
}

async function buildVersionOnlyModel(pageId: string, version: ContentUnitVersionDetail): Promise<ContentUnitDetailModel> {
  const [ancillary, storyboardEnvelope] = await Promise.all([loadVersionAncillary(version), safeListStoryboards()]);
  const primaryParentRef = primaryParentReference(ancillary.whereUsed);
  const parentDetail = primaryParentRef?.objectType === "work_product_version" ? await safeGetWorkProductVersion(primaryParentRef.objectId) : undefined;
  const slidePosition = parentDetail ? findFilmstripPosition(parentDetail.filmstrip, version.id) : null;
  const activityEvents = buildActivityTimeline({ versions: [{ version }], comments: ancillary.comments, notes: ancillary.notes });

  return {
    source: "version",
    pageId,
    title: version.summary ?? `ContentUnit ${version.versionNumber}`,
    isCanonical: false,
    isApproved: version.approvalState === "approved",
    isAiLinked: false,
    isRestricted: false,
    freshnessState: version.freshnessState,
    version,
    currentVariant: undefined,
    variantOptions: [],
    flatVersions: [],
    hasFamily: false,
    summary: version.summary,
    tags: [],
    provenance: version.provenance,
    slidePosition,
    parentTitle: primaryParentRef?.title ?? null,
    previewUri: version.thumbnailUri ?? version.renderUri,
    thumb: version.thumbnailUri,
    ancillary,
    storyboards: storyboardEnvelope.items,
    activityEvents
  };
}

async function loadVersionAncillary(version: ContentUnitVersionDetail): Promise<AncillaryData> {
  const [similar, whereUsed, comments, notes] = await Promise.all([
    safeListSimilar(version.id),
    safeListWhereUsed(version.id),
    safeListComments(version.id),
    safeListNotes(version.id)
  ]);

  return {
    similar,
    whereUsed,
    comments: comments.length ? comments : version.comments ?? [],
    notes: notes.length ? notes : version.notes ?? []
  };
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
    return await boxbrainApi.listComments("content_unit_version", versionId);
  } catch {
    return [];
  }
}

async function safeListNotes(versionId: string) {
  try {
    return await boxbrainApi.listNotes("content_unit_version", versionId);
  } catch {
    return [];
  }
}

async function safeListStoryboards() {
  try {
    return await boxbrainApi.listStoryboards();
  } catch {
    return { items: [], nextCursor: null };
  }
}

async function safeGetWorkProductVersion(id: string): Promise<WorkProductVersionDetail | undefined> {
  try {
    return await boxbrainApi.getWorkProductVersion(id);
  } catch {
    return undefined;
  }
}

function selectVersionId(variants: ContentUnitVariant[], groups: Array<{ variant: ContentUnitVariant; versions: ContentUnitVersion[] }>) {
  const canonical = variants.find((variant) => variant.isCanonical) ?? variants[0];
  if (canonical?.latestVersionId) return canonical.latestVersionId;
  if (canonical?.latestVersion?.id) return canonical.latestVersion.id;
  return groups.find((group) => group.versions.length > 0)?.versions[0]?.id;
}

function emptyAncillary(): AncillaryData {
  return { similar: [], whereUsed: [], comments: [], notes: [] };
}

// ---------------------------------------------------------------------------
// Server actions (write wiring). All governance/comment/note actions from the
// pre-uplift implementation are preserved; createPersistentCommentAction gained
// optional parentCommentId support for the new reply affordance, and
// addToStoryboardAction is new (wires the previously decorative "Add to Deck"
// header button to the real Storyboard API).
// ---------------------------------------------------------------------------

async function createPersistentCommentAction(formData: FormData) {
  "use server";

  const pageId = requiredFormValue(formData, "pageId");
  const versionId = requiredFormValue(formData, "versionId");
  const body = requiredFormValue(formData, "body");
  const parentCommentId = optionalFormValue(formData, "parentCommentId");
  await boxbrainApi.createComment({
    kind: "persistent_comment",
    targetType: "content_unit_version",
    targetId: versionId,
    body,
    parentCommentId: parentCommentId ?? undefined
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

async function addToStoryboardAction(formData: FormData) {
  "use server";

  const versionId = requiredFormValue(formData, "versionId");
  const title = requiredFormValue(formData, "title");
  const storyboardId = requiredFormValue(formData, "storyboardId");

  let targetStoryboardId = storyboardId;

  if (storyboardId === "__new__") {
    const newTitle = optionalFormValue(formData, "newStoryboardTitle") ?? `${title} storyboard`;
    const storyboard = await boxbrainApi.createStoryboard({ title: newTitle, mode: "work_product" });
    const section = await boxbrainApi.createStoryboardSection(storyboard.id, { title: "From ContentUnit", orderIndex: 0 });
    targetStoryboardId = storyboard.id;
    await boxbrainApi.createStoryboardSlot(section.id, {
      slotType: "content_unit",
      selectedObjectType: "content_unit_version",
      selectedObjectId: versionId,
      orderIndex: 0,
      purpose: title,
      isRequired: true
    });
  } else {
    const storyboard = await boxbrainApi.getStoryboard(storyboardId);
    const section = storyboard.draftSections[0] ?? (await boxbrainApi.createStoryboardSection(storyboardId, { title: "From ContentUnit", orderIndex: 0 }));
    await boxbrainApi.createStoryboardSlot(section.id, {
      slotType: "content_unit",
      selectedObjectType: "content_unit_version",
      selectedObjectId: versionId,
      orderIndex: section.slots.length,
      purpose: title,
      isRequired: true
    });
  }

  revalidatePath(`/storyboards/${targetStoryboardId}`);
  redirect(`/storyboards/${targetStoryboardId}`);
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

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

function ContentUnitDetailView({
  model,
  activeTab,
  activePanel
}: {
  model: ContentUnitDetailModel;
  activeTab: ContentUnitTabKey;
  activePanel: OverviewPanelKey;
}) {
  const carouselCards = buildCarouselCards(model);
  const versionsHref = `/content-units/${model.pageId}?tab=versions`;
  const similarHref = `/content-units/${model.pageId}?tab=similar`;
  const commentsHref = `/content-units/${model.pageId}?tab=comments`;
  const notesHref = `/content-units/${model.pageId}?tab=notes`;

  return (
    <div className="route-body" data-testid="content-unit-page">
      <ContentUnitHeaderBlock
        pageId={model.pageId}
        versionId={model.version?.id}
        title={model.title}
        isCanonical={model.isCanonical}
        isApproved={model.isApproved}
        isAiLinked={model.isAiLinked}
        isRestricted={model.isRestricted}
        freshnessState={model.freshnessState}
        slideId={model.version?.id}
        slidePosition={model.slidePosition}
        parentTitle={model.parentTitle}
        lastModified={model.version?.createdAt}
        breadcrumbParentTitle={model.parentTitle}
        thumb={model.thumb}
        storyboards={model.storyboards}
        addToStoryboardAction={addToStoryboardAction}
      />

      <ContentUnitTabNav pageId={model.pageId} active={activeTab} versionId={model.version?.id} counts={{ comments: model.ancillary.comments.length, notes: model.ancillary.notes.length }} />

      {activeTab === "overview" && (
        <OverviewTab
          pageId={model.pageId}
          previewTitle={model.title}
          previewUri={model.previewUri}
          panel={activePanel}
          version={model.version}
          summary={model.summary}
          tags={model.tags}
          provenance={model.provenance}
          slidePosition={model.slidePosition}
          carouselCards={carouselCards}
          whereUsed={model.ancillary.whereUsed}
          similar={model.ancillary.similar}
          activityEvents={model.activityEvents}
          similarHref={similarHref}
        />
      )}

      {activeTab === "variants" && (
        <VariantsTab
          pageId={model.pageId}
          hasFamily={model.hasFamily}
          version={model.version}
          previewSubtitle={model.version?.extractedText}
          sourceDocName={model.parentTitle}
          flatVersions={model.flatVersions}
          provenance={model.provenance}
          slidePosition={model.slidePosition}
          tags={model.tags}
          comments={model.ancillary.comments}
          notes={model.ancillary.notes}
          similar={model.ancillary.similar}
          whereUsed={model.ancillary.whereUsed}
          variationExplorerHref="/variation-explorer"
          similarHref={similarHref}
          commentsHref={commentsHref}
          notesHref={notesHref}
          versionsHref={versionsHref}
          createCommentAction={createPersistentCommentAction}
          createNoteAction={createNoteAction}
        />
      )}

      {activeTab === "versions" && <VersionsTab pageId={model.pageId} entries={model.flatVersions} selectedVersionId={model.version?.id} />}

      {activeTab === "similar" && <SimilarTab items={model.ancillary.similar} />}

      {activeTab === "comments" && (
        <CommentsTab pageId={model.pageId} versionId={model.version?.id} comments={model.ancillary.comments} createCommentAction={createPersistentCommentAction} />
      )}

      {activeTab === "notes" && <NotesTab pageId={model.pageId} versionId={model.version?.id} notes={model.ancillary.notes} createNoteAction={createNoteAction} />}

      {activeTab === "activity" && <ActivityTab events={model.activityEvents} />}

      <GovernancePanel
        pageId={model.pageId}
        version={model.version}
        variantOptions={model.variantOptions}
        currentVariantId={model.currentVariant?.id}
        updateApprovalAction={updateApprovalAction}
        updateFreshnessAction={updateFreshnessAction}
        setCanonicalVariantAction={setCanonicalVariantAction}
      />
    </div>
  );
}

function buildCarouselCards(model: ContentUnitDetailModel): CarouselCard[] {
  const cards: CarouselCard[] = [];
  const thumbVariants: Array<"dark" | "light" | "teal" | "purple"> = ["light", "dark", "teal", "purple"];

  if (model.version) {
    const badge = versionBadge(model.currentVariant, model.version);
    cards.push({
      id: `current-${model.version.id}`,
      href: `/content-units/${model.pageId}`,
      title: model.title,
      thumbVariant: "light",
      badgeLabel: badge.label,
      badgeTone: badge.tone,
      matchScore: null,
      isCurrent: true,
      createdAt: model.version.createdAt,
      selectionId: model.version.id,
      selectionSubtitle: model.parentTitle ?? undefined
    });
  }

  const siblingVariants = model.variantOptions.filter((variant) => variant.id !== model.currentVariant?.id);
  siblingVariants.forEach((variant, index) => {
    const latest = model.flatVersions.find((entry) => entry.variant.id === variant.id)?.version ?? variant.latestVersion ?? undefined;
    if (!latest) return;
    const badge = versionBadge(variant, latest);
    cards.push({
      id: `variant-${variant.id}`,
      href: `/content-units/${model.pageId}?version=${latest.id}`,
      title: variant.variantLabel,
      thumbVariant: thumbVariants[(index + 1) % thumbVariants.length],
      badgeLabel: badge.label,
      badgeTone: badge.tone,
      matchScore: null,
      isCurrent: false,
      createdAt: latest.createdAt,
      selectionId: latest.id,
      selectionSubtitle: variant.variantLabel
    });
  });

  model.ancillary.similar.forEach((item, index) => {
    const chips = item.statusChips;
    const tone: Tone = chips?.isCanonical ? "primary" : approvalTone(chips?.approvalState ?? "draft");
    const label = chips?.isCanonical ? "Canonical" : titleCase(chips?.approvalState ?? "draft");
    cards.push({
      id: `similar-${item.objectId}`,
      href: `/content-units/${item.objectId}`,
      title: item.title,
      thumbVariant: thumbVariants[(index + 2) % thumbVariants.length],
      badgeLabel: label,
      badgeTone: tone,
      matchScore: normalizeScore(item.score),
      isCurrent: false,
      createdAt: undefined,
      selectionId: item.objectId,
      selectionSubtitle: item.summary ?? undefined
    });
  });

  return cards;
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
