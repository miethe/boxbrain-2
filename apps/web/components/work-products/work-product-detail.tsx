"use client";

import Link from "next/link";
import {
  Activity,
  BookmarkPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  GitCompare,
  Grid2X2,
  Info,
  Layers,
  Library,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Share2,
  Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMySelection } from "@/components/selection";
import { Avatar, Badge, Button, Card, IconButton, StatusBadge, Tabs, Tag } from "@/components/ui";
import {
  BarSparkline,
  ComingSoonPanel,
  DataBadge,
  DeckThumb,
  DonutGauge,
  EmptyInline,
  MetricTile,
  RailCard,
  SectionLabel
} from "@/components/work-products/primitives";
import type { Comment, ContentUnitWhereUsedReference, Note, SearchResultItem, WorkProductFamilyCard, WorkProductVersionDetail } from "@/lib/api";
import {
  approvalTone,
  deriveSections,
  formatDate,
  formatDateTime,
  freshnessTone,
  statusChipsFor,
  thumbVariantForIndex,
  titleCase,
  type WorkProductSection,
  type WorkProductSlot
} from "@/features/work-products/lib";

type WorkProductTab = "overview" | "variants" | "versions" | "similar" | "storyboard" | "comments" | "notes" | "activity";

export type WorkProductDetailProps = {
  workProduct: WorkProductVersionDetail;
  families: WorkProductFamilyCard[];
  comments: Comment[];
  notes: Note[];
  similarByUnit: Record<string, SearchResultItem[]>;
  whereUsedByUnit: Record<string, ContentUnitWhereUsedReference[]>;
  apiBaseUrl: string;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  createNoteAction: (formData: FormData) => void | Promise<void>;
};

const analyticsValues = [12, 18, 10, 24, 16, 21, 9, 14, 11, 18, 13, 15, 20, 17];

export function WorkProductDetail({
  workProduct,
  families,
  comments,
  notes,
  similarByUnit,
  whereUsedByUnit,
  apiBaseUrl,
  createCommentAction,
  createNoteAction
}: WorkProductDetailProps) {
  const [activeTab, setActiveTab] = useState<WorkProductTab>("overview");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const sections = useMemo(() => deriveSections(workProduct.filmstrip), [workProduct.filmstrip]);
  const slots = useMemo(() => sections.flatMap((section) => section.slots), [sections]);
  const [activeSlotId, setActiveSlotId] = useState(slots[0]?.id ?? "");
  const activeSlot = slots.find((slot) => slot.id === activeSlotId) ?? slots[0];
  const selection = useMySelection();
  const statusChips = statusChipsFor(workProduct);
  const selected = selection.has(workProduct.id);
  const currentPreview = workProduct.filmstrip[previewIndex];
  const previewTitle = currentPreview?.summary ?? workProduct.title;

  function toggleSelection() {
    selection.toggle({
      id: workProduct.id,
      type: "workproduct",
      title: workProduct.title,
      subtitle: `${workProduct.artifactType} · ${workProduct.versionNumber}`,
      thumb: workProduct.previewUri ?? undefined
    });
  }

  return (
    <div className="route-body" data-testid="work-product-detail-screen">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold text-[var(--primary)]">
            <Link href="/work-products" className="link">
              WorkProducts
            </Link>
            <span className="mx-2 text-[var(--ink-4)]">/</span>
            <span className="text-[var(--ink-3)]">Work Product Detail</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--ink)]">{workProduct.title}</h1>
            <Badge kind="primary">{titleCase(workProduct.artifactType)}</Badge>
            <Tag>{workProduct.versionNumber}</Tag>
            <StatusBadge tone={approvalTone(workProduct.approvalState)}>{titleCase(workProduct.approvalState)}</StatusBadge>
            {statusChips.freshnessState && <StatusBadge tone={freshnessTone(statusChips.freshnessState)}>{titleCase(statusChips.freshnessState)}</StatusBadge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" type="button">
            <Eye size={13} aria-hidden="true" /> Preview Full Deck
          </Button>
          <Button size="sm" type="button" onClick={toggleSelection}>
            <BookmarkPlus size={13} aria-hidden="true" /> {selected ? "In Selection" : "Add to Selection"}
          </Button>
          <Button size="sm" type="button">
            <Share2 size={13} aria-hidden="true" /> Share
          </Button>
          <IconButton label="More WorkProduct actions">
            <MoreHorizontal size={14} aria-hidden="true" />
          </IconButton>
          <span className="btn-split">
            <button className="btn btn-primary btn-sm" type="button" disabled title="Create Variant API is not exposed yet">
              <Plus size={13} aria-hidden="true" /> Create Variant
            </button>
            <button className="btn btn-primary btn-sm" type="button" disabled aria-label="Open variant menu">
              <ChevronDown size={12} aria-hidden="true" />
            </button>
          </span>
          <Link className="btn btn-primary btn-sm" href={`/publish/${workProduct.id}`}>
            <PackageCheck size={13} aria-hidden="true" /> Publish Review
          </Link>
        </div>
      </div>

      <Tabs
        active={activeTab}
        onChange={(value) => setActiveTab(value as WorkProductTab)}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "variants", label: "Variants", count: statusChips.isCanonical ? "1+" : 1 },
          { id: "versions", label: "Versions", count: 1 },
          { id: "similar", label: "Similar" },
          { id: "storyboard", label: "Storyboard" },
          { id: "comments", label: "Comments", count: comments.length },
          { id: "notes", label: "Notes", count: notes.length },
          { id: "activity", label: "Activity" }
        ]}
      />

      {activeTab === "overview" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
              <DeckPreviewCard
                workProduct={workProduct}
                apiBaseUrl={apiBaseUrl}
                previewIndex={previewIndex}
                setPreviewIndex={setPreviewIndex}
                title={previewTitle}
              />
              <DeckVariantsCard workProduct={workProduct} families={families} apiBaseUrl={apiBaseUrl} />
            </div>

            <CompositionCard
              sections={sections}
              openSections={openSections}
              setOpenSections={setOpenSections}
              activeSlot={activeSlot}
              setActiveSlotId={setActiveSlotId}
              similar={activeSlot ? similarByUnit[activeSlot.unit.id] ?? [] : []}
              whereUsed={activeSlot ? whereUsedByUnit[activeSlot.unit.id] ?? [] : []}
              apiBaseUrl={apiBaseUrl}
            />

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
              <UsagePerformanceCard />
              <CollaborationCard comments={comments} notes={notes} workProductId={workProduct.id} createCommentAction={createCommentAction} createNoteAction={createNoteAction} compact />
              <SimilarityCard />
            </div>
          </div>

          <WorkProductRightRail workProduct={workProduct} sections={sections} families={families} apiBaseUrl={apiBaseUrl} />
        </div>
      )}

      {activeTab === "variants" && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <DeckVariantsCard workProduct={workProduct} families={families} apiBaseUrl={apiBaseUrl} />
          <WorkProductRightRail workProduct={workProduct} sections={sections} families={families} apiBaseUrl={apiBaseUrl} />
        </div>
      )}
      {activeTab === "versions" && <VersionHistoryTab workProduct={workProduct} />}
      {activeTab === "similar" && <SimilarityCard large />}
      {activeTab === "storyboard" && <StoryboardTab workProduct={workProduct} />}
      {activeTab === "comments" && (
        <CollaborationCard comments={comments} notes={notes} workProductId={workProduct.id} createCommentAction={createCommentAction} createNoteAction={createNoteAction} />
      )}
      {activeTab === "notes" && <NotesOnlyTab notes={notes} workProductId={workProduct.id} createNoteAction={createNoteAction} />}
      {activeTab === "activity" && <ActivityTab workProduct={workProduct} comments={comments} notes={notes} />}
    </div>
  );
}

function DeckPreviewCard({
  workProduct,
  apiBaseUrl,
  previewIndex,
  setPreviewIndex,
  title
}: {
  workProduct: WorkProductVersionDetail;
  apiBaseUrl: string;
  previewIndex: number;
  setPreviewIndex: (value: number) => void;
  title: string;
}) {
  const total = Math.max(workProduct.filmstrip.length, 1);
  const current = workProduct.filmstrip[previewIndex];
  return (
    <Card className="p-4" data-testid="work-product-deck-preview">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[13px] font-bold">Deck Preview</h2>
          <span className="text-xs text-[var(--ink-3)]">Current version</span>
          <Info size={12} color="var(--ink-4)" aria-hidden="true" />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg">
        <DeckThumb
          title={title}
          brand="BOXBRAIN"
          variant={thumbVariantForIndex(previewIndex)}
          uri={current?.thumbnailUri ?? current?.renderUri ?? workProduct.previewUri}
          apiBaseUrl={apiBaseUrl}
          className="text-[11px]"
        />
        <IconButton
          label="Previous slide"
          className="absolute left-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-0 bg-slate-900/70 text-white"
          disabled={previewIndex === 0}
          onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Next slide"
          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-0 bg-slate-900/70 text-white"
          disabled={previewIndex >= total - 1}
          onClick={() => setPreviewIndex(Math.min(total - 1, previewIndex + 1))}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--ink-3)]">
        <span className="mono">
          {Math.min(previewIndex + 1, total)} / {total}
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Show slide grid" borderless className="h-7 w-7">
            <Grid2X2 size={13} aria-hidden="true" />
          </IconButton>
          <IconButton label="Open deck preview" borderless className="h-7 w-7">
            <ExternalLink size={13} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

function DeckVariantsCard({ workProduct, families, apiBaseUrl }: { workProduct: WorkProductVersionDetail; families: WorkProductFamilyCard[]; apiBaseUrl: string }) {
  const visibleFamilies = families.slice(0, 3);
  return (
    <Card className="p-4" data-testid="work-product-variants-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Deck Variants</h2>
        <Button size="xs" type="button" disabled title="Sibling variant management is not exposed by the API yet">
          <Settings size={11} aria-hidden="true" /> Manage Variants
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]">
            Current <Badge kind="primary">Active</Badge>
          </div>
          <DeckThumb title={workProduct.title} brand="BB" uri={workProduct.previewUri} apiBaseUrl={apiBaseUrl} active />
          <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--ink-3)]">
            <span>{workProduct.filmstrip.length} slides</span>
            <StatusBadge tone={approvalTone(workProduct.approvalState)}>{titleCase(workProduct.approvalState)}</StatusBadge>
          </div>
        </div>
        {visibleFamilies.slice(0, 2).map((family, index) => (
          <div key={family.id} className="opacity-70">
            <div className="mb-1 truncate text-[11px] font-semibold text-[var(--ink-2)]">{family.title}</div>
            <DeckThumb title={family.title} brand="BB" variant={thumbVariantForIndex(index + 1)} uri={family.previewUri} apiBaseUrl={apiBaseUrl} />
            <div className="mt-1 text-[10px] text-[var(--ink-3)]">
              {family.variantCount ?? "?"} variants · {family.versionCount ?? "?"} versions
            </div>
          </div>
        ))}
      </div>
      <ComingSoonPanel
        className="mt-3"
        title="Sibling variant details unavailable"
        body="The API exposes WorkProduct family cards and counts, but not labels, thumbnails, approval state, or version history for sibling variants."
      />
    </Card>
  );
}

function CompositionCard({
  sections,
  openSections,
  setOpenSections,
  activeSlot,
  setActiveSlotId,
  similar,
  whereUsed,
  apiBaseUrl
}: {
  sections: WorkProductSection[];
  openSections: Record<string, boolean>;
  setOpenSections: (value: Record<string, boolean>) => void;
  activeSlot?: WorkProductSlot;
  setActiveSlotId: (value: string) => void;
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  apiBaseUrl: string;
}) {
  return (
    <Card className="overflow-visible p-0" data-testid="work-product-composition">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <h2 className="m-0 text-sm font-bold">
            Variant Composition <span className="text-[var(--primary)]">Current</span>
          </h2>
          <p className="m-0 mt-1 text-xs text-[var(--ink-3)]">Ordered slots are derived from the API filmstrip. Section labels are source-order groupings.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ink-3)]">View as</span>
          <select className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold">
            <option>Slots</option>
            <option>Slides</option>
            <option>Sections</option>
          </select>
          <Button size="xs" type="button" onClick={() => setOpenSections(Object.fromEntries(sections.map((section) => [section.id, false])))}>
            Collapse All
          </Button>
        </div>
      </div>
      {sections.length === 0 ? (
        <div className="p-4">
          <EmptyInline title="No filmstrip membership returned" body="The WorkProduct exists, but the API did not return ordered ContentUnit membership." />
        </div>
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="overflow-x-auto border-r border-[var(--line)]">
            <div className="grid min-w-[820px] grid-cols-[56px_1fr_1.2fr_1.35fr_0.6fr_0.8fr_32px] gap-2 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">
              <span>#</span>
              <span>Section / Slot</span>
              <span>Purpose</span>
              <span>Selected Content Unit</span>
              <span>Source</span>
              <span>Last Edited</span>
              <span />
            </div>
            {sections.map((section) => {
              const isOpen = openSections[section.id] ?? true;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-[var(--line-soft)] bg-[var(--paper)] px-4 py-2 text-left text-xs font-bold"
                    onClick={() => setOpenSections({ ...openSections, [section.id]: !isOpen })}
                  >
                    {isOpen ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
                    {section.index}. {section.title}
                    <span className="font-normal text-[var(--ink-3)]">({section.slots.length})</span>
                  </button>
                  {isOpen &&
                    section.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`grid w-full min-w-[820px] grid-cols-[56px_1fr_1.2fr_1.35fr_0.6fr_0.8fr_32px] gap-2 border-b border-[var(--line-soft)] px-4 py-2.5 text-left text-xs ${
                          activeSlot?.id === slot.id ? "bg-[var(--primary-bg)]" : "bg-transparent hover:bg-[var(--bg)]"
                        }`}
                        onClick={() => setActiveSlotId(slot.id)}
                      >
                        <span className="mono text-[11px] text-[var(--ink-3)]">{slot.id}</span>
                        <span className="truncate font-semibold text-[var(--ink)]">{slot.title}</span>
                        <span className="truncate text-[var(--ink-3)]">{slot.purpose}</span>
                        <span className="truncate font-medium text-[var(--primary)]">{slot.unit.summary ?? slot.unit.id}</span>
                        <span className="text-[var(--ink-3)]">{slot.source}</span>
                        <span className="text-[var(--ink-3)]">{formatDate(slot.lastEdited)}</span>
                        <MoreHorizontal size={13} color="var(--ink-4)" aria-hidden="true" />
                      </button>
                    ))}
                </div>
              );
            })}
            <div className="p-3">
              <Button size="sm" type="button" disabled title="Compare Variants requires sibling variant endpoints">
                <GitCompare size={13} aria-hidden="true" /> Compare Variants
              </Button>
            </div>
          </div>
          <SlotDetails slot={activeSlot} similar={similar} whereUsed={whereUsed} apiBaseUrl={apiBaseUrl} />
        </div>
      )}
    </Card>
  );
}

function SlotDetails({
  slot,
  similar,
  whereUsed,
  apiBaseUrl
}: {
  slot?: WorkProductSlot;
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  apiBaseUrl: string;
}) {
  if (!slot) {
    return (
      <div className="p-4">
        <EmptyInline title="No slot selected" body="Select a slot in the composition table to inspect its current ContentUnit." />
      </div>
    );
  }

  return (
    <div className="p-4" data-testid="work-product-slot-details">
      <h3 className="m-0 text-[13px] font-bold">
        Slot Details · <span className="text-[var(--primary)]">{slot.id}</span>
      </h3>
      <SectionLabel>Current Selection</SectionLabel>
      <div className="mt-2 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-bg)] p-3">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
          <DeckThumb
            title={slot.unit.summary ?? slot.title}
            brand="BB"
            variant="light"
            uri={slot.unit.thumbnailUri ?? slot.unit.renderUri}
            apiBaseUrl={apiBaseUrl}
            compact
          />
          <div className="min-w-0 text-xs">
            <div className="truncate font-bold">{slot.unit.summary ?? slot.title}</div>
            <div className="text-[var(--ink-3)]">ContentUnit version</div>
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-dashed border-[var(--primary-border)] pt-2 text-[11px]">
              <span className="text-[var(--ink-3)]">Version</span>
              <span>{slot.unit.versionNumber}</span>
              <span className="text-[var(--ink-3)]">Approval</span>
              <span>{titleCase(slot.unit.approvalState)}</span>
              <span className="text-[var(--ink-3)]">Last edited</span>
              <span>{formatDate(slot.unit.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SectionLabel>Swap This Slide</SectionLabel>
        <div className="flex items-center gap-1">
          <IconButton label="Search alternative content units" borderless className="h-6 w-6" disabled>
            <Search size={11} aria-hidden="true" />
          </IconButton>
          <IconButton label="Filter alternative content units" borderless className="h-6 w-6" disabled>
            <Filter size={11} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      {similar.length === 0 ? (
        <ComingSoonPanel className="mt-2" title="No swap list returned" body="ContentUnit similarity is queried when available. WorkProduct swap/apply actions are not exposed yet." />
      ) : (
        <div className="mt-2">
          {similar.slice(0, 3).map((item, index) => (
            <div key={item.objectId} className="flex items-center gap-2 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
              <div className="w-12 shrink-0">
                <DeckThumb title={item.title} brand="" variant={thumbVariantForIndex(index + 1)} uri={item.previewUri} apiBaseUrl={apiBaseUrl} compact />
              </div>
              <div className="min-w-0 flex-1 text-[11px]">
                <div className="truncate font-semibold">{item.title}</div>
                <div className="text-[10px] text-[var(--ink-3)]">{Math.round(item.score * 100)}% similar · {item.objectType}</div>
              </div>
              <Button size="xs" type="button" disabled title="Swap mutation is not exposed yet">
                Swap
              </Button>
            </div>
          ))}
        </div>
      )}

      {whereUsed.length > 0 && (
        <div className="mt-3 text-[11px] text-[var(--ink-3)]">
          Also used in {whereUsed.length} visible object{whereUsed.length === 1 ? "" : "s"}.
        </div>
      )}
      <Button size="sm" type="button" className="mt-3 w-full justify-center" disabled>
        <Library size={13} aria-hidden="true" /> Browse Content Library
      </Button>
    </div>
  );
}

function UsagePerformanceCard() {
  return (
    <Card className="p-4" data-testid="work-product-analytics-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Usage & Performance</h2>
        <select className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px]" disabled>
          <option>Last 30 days</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricTile label="Views" value="-" hint="analytics API missing" />
        <MetricTile label="Shares" value="-" hint="not available" />
        <MetricTile label="Avg. Time" value="-" hint="not available" />
        <MetricTile label="Downloads" value="-" hint="not available" />
      </div>
      <div className="mt-3 opacity-40">
        <BarSparkline values={analyticsValues} />
      </div>
      <ComingSoonPanel className="mt-2" title="No analytics endpoint" body="Views, shares, viewing time, downloads, and time-series data are not exposed by the current API." />
    </Card>
  );
}

function CollaborationCard({
  comments,
  notes,
  workProductId,
  createCommentAction,
  createNoteAction,
  compact = false
}: {
  comments: Comment[];
  notes: Note[];
  workProductId: string;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  createNoteAction: (formData: FormData) => void | Promise<void>;
  compact?: boolean;
}) {
  return (
    <Card className="p-4" data-testid="work-product-collaboration-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">
          Collaboration & Notes <span className="count-inline">{comments.length + notes.length}</span>
        </h2>
      </div>
      <form action={createCommentAction} className="mb-3 grid gap-2 rounded-lg border border-[var(--line)] p-2">
        <input type="hidden" name="pageId" value={workProductId} />
        <input type="hidden" name="versionId" value={workProductId} />
        <textarea name="body" rows={compact ? 1 : 2} required className="min-h-10 resize-none rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Add a comment or @mention..." />
        <Button size="xs" type="submit" className="justify-center">
          <MessageCircle size={12} aria-hidden="true" /> Add comment
        </Button>
      </form>
      {comments.length === 0 ? (
        <EmptyInline title="No WorkProduct comments yet" body="The comments API is wired for work_product_version targets, but this version has no comments." />
      ) : (
        comments.slice(0, compact ? 1 : 6).map((comment) => (
          <div key={comment.id} className="flex items-start gap-2 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
            <Avatar who="Reviewer" className="sm" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-semibold">
                Reviewer <span className="font-normal text-[var(--ink-3)]">{formatDateTime(comment.createdAt)}</span>
              </div>
              <div className="mt-1 leading-5 text-[var(--ink-2)]">{comment.body}</div>
              <div className="mt-1 text-[10.5px] text-[var(--ink-3)]">{comment.status}</div>
            </div>
          </div>
        ))
      )}
      {!compact && (
        <form action={createNoteAction} className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] p-2">
          <input type="hidden" name="pageId" value={workProductId} />
          <input type="hidden" name="versionId" value={workProductId} />
          <input name="title" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note title (optional)" />
          <textarea name="body" rows={2} required className="min-h-14 resize-none rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note body" />
          <Button size="xs" type="submit" className="justify-center">
            <NotebookPen size={12} aria-hidden="true" /> Add note
          </Button>
        </form>
      )}
    </Card>
  );
}

function SimilarityCard({ large = false }: { large?: boolean }) {
  return (
    <Card className={large ? "mt-5 p-4" : "p-4"} data-testid="work-product-similarity-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Similarity Suggestions</h2>
        <span className="text-[11px] text-[var(--ink-3)]">Deck-level</span>
      </div>
      <ComingSoonPanel
        title="No WorkProduct similarity endpoint"
        body="The API supports ContentUnit similarity, but does not expose deck-level WorkProduct similarity results yet."
      />
    </Card>
  );
}

function WorkProductRightRail({
  workProduct,
  sections,
  families,
  apiBaseUrl
}: {
  workProduct: WorkProductVersionDetail;
  sections: WorkProductSection[];
  families: WorkProductFamilyCard[];
  apiBaseUrl: string;
}) {
  const statusChips = statusChipsFor(workProduct);
  const sourceRefs = workProduct.provenance.sourceRefs ?? [];
  const parentRefs = workProduct.provenance.parentRefs ?? [];
  return (
    <aside className="grid content-start gap-3 xl:sticky xl:top-4" data-testid="work-product-right-rail">
      <RailCard title="Build Manifest" action={<Info size={12} color="var(--ink-4)" aria-hidden="true" />}>
        <div className="mb-2 flex items-center gap-2 text-[11px] text-[var(--ink-3)]">
          {titleCase(workProduct.artifactType)} · {workProduct.versionNumber}
          <span className="ml-auto">Built {formatDateTime(workProduct.provenance.createdAt)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Slides" value={`${workProduct.filmstrip.length}`} />
          <MetricTile label="Content Units" value={`${workProduct.filmstrip.length}`} />
          <MetricTile label="Sections" value={`${sections.length}`} />
          <MetricTile label="Size" value="-" hint="not exposed" />
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--ok)]">All API-returned members loaded</div>
      </RailCard>

      <RailCard title="Lineage & Provenance">
        <div className="flex items-center gap-2 text-[11px]">
          <Avatar who={workProduct.provenance.sourceSystem ?? "Repository"} className="sm" />
          <div className="min-w-0 flex-1">
            <b>Origin</b> <span className="text-[var(--ink-3)]">{titleCase(workProduct.provenance.originType)}</span>
          </div>
          <span className="text-[10px] text-[var(--ink-3)]">{formatDate(workProduct.provenance.createdAt)}</span>
        </div>
        <div className="mt-2 border-t border-dashed border-[var(--line-soft)] pt-2 text-[11px]">
          <div className="text-[10px] text-[var(--ink-3)]">Source references</div>
          {sourceRefs.length === 0 ? <div className="text-[var(--ink-3)]">None exposed</div> : sourceRefs.slice(0, 2).map((ref) => <div key={ref}>{ref}</div>)}
        </div>
        <div className="mt-2 border-t border-dashed border-[var(--line-soft)] pt-2 text-[11px]">
          <div className="text-[10px] text-[var(--ink-3)]">Parent references</div>
          {parentRefs.length === 0 ? <div className="text-[var(--ink-3)]">No parent refs exposed</div> : <div>{parentRefs.length} provenance parent ref(s)</div>}
        </div>
        <Button size="xs" type="button" className="mt-3 w-full justify-center" disabled>
          <Layers size={11} aria-hidden="true" /> View Provenance Graph
        </Button>
      </RailCard>

      <RailCard title="Freshness & Approval">
        <div className="flex items-center gap-3">
          <DonutGauge value={statusChips.freshnessState === "fresh" ? 100 : statusChips.freshnessState === "aging" ? 70 : 50} tone={freshnessTone(statusChips.freshnessState)} label="Freshness" />
          <div className="min-w-0 flex-1">
            <SectionLabel>Content Freshness</SectionLabel>
            <DataBadge tone={freshnessTone(statusChips.freshnessState)}>{titleCase(statusChips.freshnessState ?? "not exposed")}</DataBadge>
            <div className="mt-1 text-[10px] text-[var(--ink-3)]">WorkProduct freshness comes from statusChips when exposed.</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <DonutGauge value={workProduct.approvalState === "approved" ? 100 : 55} tone={approvalTone(workProduct.approvalState)} label="Approval" />
          <div className="min-w-0 flex-1">
            <SectionLabel>Approval Status</SectionLabel>
            <DataBadge tone={approvalTone(workProduct.approvalState)}>{titleCase(workProduct.approvalState)}</DataBadge>
            <div className="mt-1 text-[10px] text-[var(--ink-3)]">Object-scoped approval history is not exposed.</div>
          </div>
        </div>
      </RailCard>

      <RailCard title="Derived Work Product Variants">
        <div className="rounded-lg border border-[var(--line)] p-2 text-[11px]">
          <div className="font-semibold">Current version</div>
          <div className="text-[10px] text-[var(--ink-3)]">
            {workProduct.versionNumber} · {workProduct.filmstrip.length} slides
          </div>
        </div>
        <ComingSoonPanel className="mt-2" title="Variant route missing" body={`${families.length} WorkProduct families are visible, but sibling variant detail is not exposed.`} />
      </RailCard>

      <RailCard title={<span className="flex items-center gap-2"><Sparkles size={14} color="var(--ai)" aria-hidden="true" /> AI Insights <Badge kind="ai">BETA</Badge></span>}>
        <ComingSoonPanel title="No AI insight endpoint" body="Detected-impact lists and AI update recommendations are not exposed for WorkProducts yet." />
        <Button size="xs" type="button" className="mt-3 w-full justify-center" disabled>
          <RefreshCcw size={11} aria-hidden="true" /> Review Updates
        </Button>
      </RailCard>

      <RailCard title="Preview Source">
        <DeckThumb title={workProduct.title} uri={workProduct.previewUri} apiBaseUrl={apiBaseUrl} compact />
      </RailCard>
    </aside>
  );
}

function VersionHistoryTab({ workProduct }: { workProduct: WorkProductVersionDetail }) {
  return (
    <Card className="mt-5 p-4" data-testid="work-product-version-history">
      <h2 className="m-0 text-sm font-bold">Version History</h2>
      <div className="mt-3 rounded-lg border border-[var(--line)] p-3 text-sm">
        <div className="font-semibold">
          Current <span className="mono">{workProduct.versionNumber}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--ink-3)]">{formatDateTime(workProduct.provenance.createdAt)} · {titleCase(workProduct.approvalState)}</div>
      </div>
      <ComingSoonPanel className="mt-3" title="No versions-by-variant endpoint" body="The API does not expose WorkProduct version history for a family or variant. Only the currently loaded version can be shown." />
    </Card>
  );
}

function StoryboardTab({ workProduct }: { workProduct: WorkProductVersionDetail }) {
  return (
    <Card className="mt-5 p-4" data-testid="work-product-storyboard-tab">
      <h2 className="m-0 text-sm font-bold">Storyboard</h2>
      <p className="mt-2 text-sm text-[var(--ink-3)]">This WorkProduct has {workProduct.filmstrip.length} ordered ContentUnit slots.</p>
      <ComingSoonPanel title="Storyboard snapshot not exposed on WorkProduct detail" body="Storyboard sections and immutable snapshots are available through Storyboard APIs, but this WorkProduct detail payload contains only filmstrip order." />
    </Card>
  );
}

function NotesOnlyTab({ notes, workProductId, createNoteAction }: { notes: Note[]; workProductId: string; createNoteAction: (formData: FormData) => void | Promise<void> }) {
  return (
    <Card className="mt-5 p-4" data-testid="work-product-notes-tab">
      <h2 className="m-0 text-sm font-bold">Notes</h2>
      {notes.length === 0 ? (
        <EmptyInline title="No WorkProduct notes yet" body="The notes API is wired for work_product_version targets, but this version has no notes." />
      ) : (
        notes.map((note) => (
          <div key={note.id} className="border-b border-dashed border-[var(--line-soft)] py-2 text-sm last:border-b-0">
            <div className="font-semibold">{note.title ?? note.body}</div>
            {note.title && <div className="text-xs text-[var(--ink-2)]">{note.body}</div>}
            <div className="mt-1 text-[11px] text-[var(--ink-3)]">
              {formatDateTime(note.createdAt)} · {note.noteType}
            </div>
          </div>
        ))
      )}
      <form action={createNoteAction} className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] p-3">
        <input type="hidden" name="pageId" value={workProductId} />
        <input type="hidden" name="versionId" value={workProductId} />
        <input name="title" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note title (optional)" />
        <textarea name="body" rows={2} required className="min-h-16 rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note body" />
        <Button size="sm" type="submit">
          <NotebookPen size={13} aria-hidden="true" /> Add note
        </Button>
      </form>
    </Card>
  );
}

function ActivityTab({ workProduct, comments, notes }: { workProduct: WorkProductVersionDetail; comments: Comment[]; notes: Note[] }) {
  const events = [
    { id: "loaded", icon: FileText, title: `Loaded ${workProduct.versionNumber}`, detail: formatDateTime(workProduct.provenance.createdAt) },
    ...comments.slice(0, 3).map((comment) => ({ id: comment.id, icon: MessageCircle, title: "Comment recorded", detail: formatDateTime(comment.createdAt) })),
    ...notes.slice(0, 3).map((note) => ({ id: note.id, icon: NotebookPen, title: "Note recorded", detail: formatDateTime(note.createdAt) }))
  ];
  return (
    <Card className="mt-5 p-4" data-testid="work-product-activity-tab">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Activity size={16} aria-hidden="true" /> Activity
      </div>
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <div key={event.id} className="flex items-start gap-2 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--bg-2)] text-[var(--primary)]">
              <Icon size={13} aria-hidden="true" />
            </span>
            <div className="text-sm">
              <div className="font-semibold">{event.title}</div>
              <div className="text-xs text-[var(--ink-3)]">{event.detail}</div>
            </div>
          </div>
        );
      })}
      <ComingSoonPanel className="mt-3" title="Object-scoped audit log unavailable" body="Governance actions write audit events, but only admin-wide audit listing exists today." />
    </Card>
  );
}
