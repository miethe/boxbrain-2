"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Files,
  FolderPlus,
  GitCompareArrows,
  Info,
  Layers,
  PanelTop,
  PlayCircle,
  Plus,
  Share2,
  X
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Badge, Button, Card, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import {
  API_BASE_URL,
  ApiError,
  boxbrainApi,
  type ContentUnitFamilyCard,
  type ContentUnitFamilyDetail,
  type ContentUnitVariant,
  type ContentUnitVersion,
  type ContentUnitVersionDetail,
  type ContentUnitWhereUsedReference,
  type ProvenanceRecord,
  type SearchResultItem,
  type StatusChips,
  type Taxonomy
} from "@/lib/api";
import {
  buildVariationStack,
  normalizeSimilarityScore,
  partitionWhereUsed,
  type VariationStackItem,
  type WhereUsedPartitions
} from "@/features/variation-explorer/lib";

type ExplorerData = {
  families: ContentUnitFamilyCard[];
  family: ContentUnitFamilyDetail;
  variants: ContentUnitVariant[];
  versionsByVariant: Record<string, ContentUnitVersion[]>;
  selectedVariant?: ContentUnitVariant;
  selectedVersion?: ContentUnitVersionDetail;
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  resolved: ExplorerParams;
};

type ExplorerParams = {
  family?: string;
  variant?: string;
  version?: string;
};

type ExplorerState =
  | { status: "loading" }
  | { status: "ready"; data: ExplorerData }
  | { status: "empty" }
  | { status: "restricted" }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

type RailItem =
  | {
      kind: "current";
      id: string;
      title: string;
      summary?: string | null;
      previewUri?: string | null;
      version?: ContentUnitVersionDetail;
      statusChips?: StatusChips;
    }
  | {
      kind: "similar";
      id: string;
      title: string;
      summary?: string | null;
      previewUri?: string | null;
      score: number;
      raw: SearchResultItem;
      statusChips?: StatusChips;
    };

type CompareItem = {
  id: string;
  title: string;
  summary?: string | null;
  previewUri?: string | null;
  versionNumber?: string;
  approvalState?: string;
  freshnessState?: string;
  updatedAt?: string;
};

const railTrackStyle: CSSProperties = {
  gridTemplateColumns: "none",
  gridAutoFlow: "column",
  gridAutoColumns: "minmax(190px, 220px)",
  overflowX: "auto",
  overscrollBehaviorInline: "contain",
  scrollSnapType: "x mandatory",
  padding: "4px"
};

export function VariationExplorerClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ExplorerState>({ status: "loading" });
  const [retryNonce, setRetryNonce] = useState(0);
  const [copied, setCopied] = useState<"share" | "id" | "text" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedVariations, setExpandedVariations] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [railFocusIndex, setRailFocusIndex] = useState(0);
  const [variationFocusIndex, setVariationFocusIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const variationRef = useRef<HTMLDivElement>(null);
  // Canonicalize the inbound URL at most once; interactions already write canonical
  // hrefs, and replacing on every load can oscillate between resolved variants.
  const canonicalizedRef = useRef(false);

  const params = useMemo<ExplorerParams>(
    () => ({
      family: cleanParam(searchParams.get("family")),
      variant: cleanParam(searchParams.get("variant")),
      version: cleanParam(searchParams.get("version"))
    }),
    [searchParams]
  );

  const paramsKey = `${params.family ?? ""}|${params.variant ?? ""}|${params.version ?? ""}|${retryNonce}`;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loadExplorer(params)
      .then((result) => {
        if (cancelled) return;
        setState(result);
        if (result.status === "ready" && !canonicalizedRef.current) {
          canonicalizedRef.current = true;
          const nextHref = explorerHref(pathname, result.data.resolved);
          const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
          if (nextHref !== currentHref) router.replace(nextHref, { scroll: false });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState(classifyLoadError(error));
      });

    return () => {
      cancelled = true;
    };
    // searchParams is represented by paramsKey above, which avoids reloading on object identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pathname, router]);

  const retry = useCallback(() => setRetryNonce((value) => value + 1), []);

  if (state.status === "loading") {
    return <LoadingExplorer />;
  }

  if (state.status === "restricted") {
    return <RestrictedExplorer />;
  }

  if (state.status === "not_found") {
    return <NotFoundExplorer message={state.message} />;
  }

  if (state.status === "empty") {
    return <EmptyExplorer retry={retry} />;
  }

  if (state.status === "error") {
    return <ErrorExplorer message={state.message} retry={retry} />;
  }

  const { data } = state;
  const selectedVersion = data.selectedVersion;
  const variationItems = buildVariationStack({
    variants: data.variants,
    versionsByVariant: data.versionsByVariant,
    selectedVariantId: data.selectedVariant?.id,
    selectedVersionId: selectedVersion?.id
  });
  const visibleVariationItems = expandedVariations ? variationItems : variationItems.slice(0, 3);
  const railItems = buildRailItems(data);
  const whereUsed = partitionWhereUsed(data.whereUsed);
  const similarStats = similarityStats(data.similar);
  const tags = taxonomyTags(data.family.taxonomy);
  const currentCompareItem = selectedVersion ? compareFromVersion(selectedVersion, data.family.familyTitle) : undefined;
  const selectedCompareIds = new Set(compareItems.map((item) => item.id));
  const extractedText = selectedVersion?.extractedText?.trim();

  const replaceExplorerParams = (next: ExplorerParams) => {
    router.replace(explorerHref(pathname, next), { scroll: false });
  };

  const selectVersion = (versionId?: string, variantId?: string, familyId?: string) => {
    if (!versionId) return;
    replaceExplorerParams({
      family: familyId ?? data.family.id,
      variant: variantId ?? data.selectedVariant?.id,
      version: versionId
    });
  };

  const toggleCompare = (item?: CompareItem) => {
    if (!item) return;
    setCompareItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current.filter((entry) => entry.id !== item.id);
      return [...current, item].slice(-2);
    });
  };

  const copy = async (kind: "share" | "id" | "text", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  };

  const handleRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    setRailFocusIndex((current) => focusIndexedCard(railRef.current, current, delta, railItems.length, "rail"));
  };

  const handleVariationKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    setVariationFocusIndex((current) => focusIndexedCard(variationRef.current, current, delta, visibleVariationItems.length, "variation"));
  };

  return (
    <div className="route-body">
      <div className="page-head-row">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-slate-950" style={{ letterSpacing: 0 }}>
            ContentUnit Variation Explorer
            <button
              type="button"
              className="icon-btn borderless !h-6 !w-6"
              aria-label="About the variation explorer"
              title="Explore similar concepts horizontally and alternate versions vertically."
            >
              <Info size={14} aria-hidden="true" />
            </button>
          </h1>
          <div className="muted mt-1 text-[13px]">Explore similar concepts horizontally and alternate versions vertically.</div>
        </div>
        <div className="page-head-actions">
          <Button size="sm" onClick={() => copy("share", window.location.href)}>
            <Share2 size={14} aria-hidden="true" /> {copied === "share" ? "Copied" : "Share"}
          </Button>
          <Button
            size="sm"
            disabled={compareItems.length !== 2}
            data-testid="ve-compare-open"
            onClick={() => setCompareOpen(true)}
          >
            <GitCompareArrows size={14} aria-hidden="true" /> Compare ({compareItems.length})
          </Button>
          <AddToDeckSplit open={menuOpen} onOpenChange={setMenuOpen} />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <div className="mb-2.5 flex items-center gap-3">
            <b className="text-xs uppercase text-slate-500" style={{ letterSpacing: "0.06em" }}>
              Similar Concepts
            </b>
            <span className="muted text-[11px]">Swipe / scroll horizontally</span>
            <span className="flex-1" />
            <span className="muted flex items-center gap-1 text-[11px]">
              <ArrowLeft size={12} aria-hidden="true" /> Swipe / scroll <ArrowRight size={12} aria-hidden="true" /> horizontally
            </span>
          </div>

          <div className="ve-rail" data-testid="ve-rail">
            <button type="button" className="ve-arrow" aria-label="Scroll similar concepts left" onClick={() => scrollRail(-1)}>
              <ArrowLeft size={14} aria-hidden="true" />
            </button>
            <div ref={railRef} className="ve-rail-track" style={railTrackStyle} onKeyDown={handleRailKeyDown}>
              {railItems.map((item, index) => (
                <RailCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  index={index}
                  isBest={item.kind === "similar" && item.score === similarStats.best}
                  isCompareSelected={selectedCompareIds.has(item.id)}
                  tabIndex={railFocusIndex === index ? 0 : -1}
                  compareItem={item.kind === "current" ? currentCompareItem : compareFromSearchResult(item.raw)}
                  onFocus={() => setRailFocusIndex(index)}
                  onAnchor={() => {
                    if (item.kind === "similar") replaceExplorerParams({ version: item.id });
                  }}
                  onToggleCompare={toggleCompare}
                />
              ))}
              {data.similar.length === 0 && (
                <div className="ve-concept flex min-h-[170px] items-center justify-center text-center text-sm text-slate-500" style={{ scrollSnapAlign: "start" }}>
                  No similar concepts yet
                </div>
              )}
            </div>
            <button type="button" className="ve-arrow" aria-label="Scroll similar concepts right" onClick={() => scrollRail(1)}>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center">
            <div className="ve-pagination-dot" />
          </div>

          <div className="mt-[18px] grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <b className="text-xs uppercase text-slate-500" style={{ letterSpacing: "0.06em" }}>
                  Variations
                </b>
                <span className="muted flex items-center gap-1 text-[10px]">
                  <ArrowUp size={10} aria-hidden="true" />
                  <ArrowDown size={10} aria-hidden="true" />
                </span>
              </div>
              <div className="muted mb-2.5 text-[10px]">Swipe / scroll vertically</div>
              <div ref={variationRef} className="grid gap-2.5" onKeyDown={handleVariationKeyDown}>
                {visibleVariationItems.length === 0 ? (
                  <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">No variants or prior versions returned.</div>
                ) : (
                  visibleVariationItems.map((item, index) => (
                    <VariationCard
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      index={index}
                      tabIndex={variationFocusIndex === index ? 0 : -1}
                      isCompareSelected={selectedCompareIds.has(item.id)}
                      onFocus={() => setVariationFocusIndex(index)}
                      onSelect={() => selectVersion(item.versionId, item.variantId, item.familyId)}
                      onToggleCompare={toggleCompare}
                    />
                  ))
                )}
              </div>
              {variationItems.length > 3 && (
                <button
                  type="button"
                  className="link mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-slate-100 p-2 text-xs"
                  onClick={() => setExpandedVariations((value) => !value)}
                >
                  {expandedVariations ? "Show fewer variations" : `View all ${variationItems.length} variations`} <ChevronDown size={10} aria-hidden="true" />
                </button>
              )}
            </section>

            <PreviewPanel version={selectedVersion} family={data.family} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 p-2">
            <span className="muted text-xs">{railItems.length > 0 ? `1 / ${railItems.length}` : "0 / 0"}</span>
            <button type="button" className="icon-btn rounded-full" aria-label="Previous similar concept" onClick={() => anchorFromRail(railItems, -1, replaceExplorerParams)}>
              <ArrowLeft size={14} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn rounded-full" aria-label="Next similar concept" onClick={() => anchorFromRail(railItems, 1, replaceExplorerParams)}>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3.5 grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
            <IncludedPanel title="Included in Plays" count={whereUsed.plays.length}>
              <ReferenceRows items={whereUsed.plays} empty="Not referenced by any plays yet" />
            </IncludedPanel>
            <WorkProductsPanel partitions={whereUsed} />
            <ActionsPanel version={selectedVersion} />
          </div>
        </main>

        <aside data-testid="ve-details-rail" className="grid content-start gap-3.5 xl:sticky xl:top-4">
          <Card className="p-3.5">
            <SectionTitle>ContentUnit Details</SectionTitle>
            <div className="mt-2.5 grid grid-cols-[110px_1fr] gap-x-2.5 gap-y-2 text-xs">
              <DetailLabel>ContentUnit ID</DetailLabel>
              <div className="flex min-w-0 items-center gap-1">
                <span className="mono truncate">{selectedVersion?.id ?? data.family.id}</span>
                <button
                  type="button"
                  className="icon-btn borderless !h-5 !w-5"
                  aria-label="Copy ContentUnit ID"
                  onClick={() => copy("id", selectedVersion?.id ?? data.family.id)}
                >
                  {copied === "id" ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
                </button>
              </div>
              <DetailLabel>Source</DetailLabel>
              <div>{provenanceSource(selectedVersion?.provenance) ?? "No provenance source returned"}</div>
              <DetailLabel>Last Updated</DetailLabel>
              <div>{formatDate(selectedVersion?.createdAt)}{actorText(selectedVersion) ? ` by ${actorText(selectedVersion)}` : ""}</div>
              {provenanceLocation(selectedVersion?.provenance) && (
                <>
                  <DetailLabel>File Location</DetailLabel>
                  <div className="mono break-words text-[11px]">{provenanceLocation(selectedVersion?.provenance)}</div>
                </>
              )}
              {tags.length > 0 && (
                <>
                  <DetailLabel>Tags</DetailLabel>
                  <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 4).map((tag) => (
                      <Tag key={tag} tone="blue" size="sm">
                        {tag}
                      </Tag>
                    ))}
                    {tags.length > 4 && <Tag size="sm">+{tags.length - 4}</Tag>}
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedVersion && <StatusRow version={selectedVersion} />}
            </div>
          </Card>

          <Card className="p-3.5">
            <SectionTitle>Similarity &amp; Relevance</SectionTitle>
            <div className="mt-3 text-xs">
              <MetricBar label="Best Match" value={similarStats.best} tone="ok" />
              <MetricBar label="Average Similarity (All)" value={similarStats.average} tone="primary" className="mt-2.5" />
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2.5">
                <span className="muted">Total Similar Concepts</span>
                <b>{data.similar.length}</b>
              </div>
            </div>
          </Card>

          {extractedText && (
            <Card className="p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle>Extracted Text</SectionTitle>
                <button type="button" className="link flex items-center gap-1 text-[11px]" onClick={() => copy("text", extractedText)}>
                  <Clipboard size={12} aria-hidden="true" /> {copied === "text" ? "Copied" : "Copy all"}
                </button>
              </div>
              <div
                className="rounded-md bg-slate-100 p-2.5 text-[11px] leading-relaxed text-slate-700"
                style={
                  showFullText
                    ? undefined
                    : {
                        display: "-webkit-box",
                        WebkitLineClamp: 8,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }
                }
              >
                {extractedText}
              </div>
              <button type="button" className="link mt-2 inline-block text-[11px]" onClick={() => setShowFullText((value) => !value)}>
                {showFullText ? "Show less" : "Show more"}
              </button>
            </Card>
          )}
        </aside>
      </div>

      {compareOpen && (
        <CompareModal items={compareItems} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );

  function scrollRail(direction: -1 | 1) {
    railRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  }
}

function RailCard({
  item,
  index,
  isBest,
  isCompareSelected,
  tabIndex,
  compareItem,
  onFocus,
  onAnchor,
  onToggleCompare
}: {
  item: RailItem;
  index: number;
  isBest: boolean;
  isCompareSelected: boolean;
  tabIndex: number;
  compareItem?: CompareItem;
  onFocus: () => void;
  onAnchor: () => void;
  onToggleCompare: (item?: CompareItem) => void;
}) {
  const isCurrent = item.kind === "current";
  const matchLabel = isCurrent ? "Selected" : isBest ? "Best Match" : `${item.score}% Match`;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.metaKey || event.ctrlKey) {
      onToggleCompare(compareItem);
      return;
    }
    onAnchor();
  };

  return (
    <button
      type="button"
      data-testid={`ve-concept-${item.id}`}
      data-rail-index={index}
      className={`ve-concept card-hoverable ${isCurrent ? "current" : ""}`}
      style={{ scrollSnapAlign: "start", textAlign: "left" }}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={handleClick}
      aria-current={isCurrent ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="ve-concept-match">{matchLabel}</div>
        <input
          type="checkbox"
          className={isCompareSelected ? "mt-0.5" : "card-hover-show mt-0.5"}
          aria-label={`Compare ${item.title}`}
          checked={isCompareSelected}
          onChange={() => onToggleCompare(compareItem)}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
      <div className="relative mt-1.5 overflow-hidden rounded">
        <ThumbWithFallback uri={item.previewUri} title={item.title} />
        {isCurrent && (
          <div className="ve-concept-check">
            <Check size={14} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-900">{item.title}</div>
      <div className="muted mono mt-0.5 text-[10px]">ID: {item.id}</div>
    </button>
  );
}

function VariationCard({
  item,
  index,
  tabIndex,
  isCompareSelected,
  onFocus,
  onSelect,
  onToggleCompare
}: {
  item: VariationStackItem;
  index: number;
  tabIndex: number;
  isCompareSelected: boolean;
  onFocus: () => void;
  onSelect: () => void;
  onToggleCompare: (item?: CompareItem) => void;
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.metaKey || event.ctrlKey) {
      onToggleCompare(compareFromVariation(item));
      return;
    }
    onSelect();
  };

  return (
    <button
      type="button"
      data-testid={`ve-variant-${item.id}`}
      data-variation-index={index}
      className={`ve-variant card-hoverable ${item.isCurrent ? "current" : ""}`}
      style={{ textAlign: "left" }}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={handleClick}
      aria-current={item.isCurrent ? "true" : undefined}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Badge kind={item.badgeTone}>{item.badge}</Badge>
        <input
          type="checkbox"
          className={isCompareSelected ? "" : "card-hover-show"}
          aria-label={`Compare ${item.subtitle}`}
          checked={isCompareSelected}
          onChange={() => onToggleCompare(compareFromVariation(item))}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
      <div className="overflow-hidden rounded">
        <ThumbWithFallback uri={item.previewUri} title={item.title} />
      </div>
      <div className="mt-1.5 text-[11px]">
        <div className="font-semibold text-slate-900">{item.subtitle}</div>
        <div className="muted mt-px text-[10px]">{item.caption}</div>
      </div>
    </button>
  );
}

function PreviewPanel({ version, family }: { version?: ContentUnitVersionDetail; family: ContentUnitFamilyDetail }) {
  const previewUri = version?.renderUri ?? version?.thumbnailUri ?? null;
  const source = provenanceSource(version?.provenance);
  const pageIndex = typeof version?.sourceOrderIndex === "number" ? version.sourceOrderIndex + 1 : undefined;
  const title = family.familyTitle || version?.summary || "ContentUnit";

  return (
    <Card className="relative p-[22px]" data-testid="ve-preview">
      {version?.renderUri && (
        <a className="icon-btn absolute right-3 top-3" href={assetUrl(version.renderUri)} target="_blank" rel="noreferrer" aria-label="Open rendered slide in a new tab">
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
      {previewUri ? (
        <ImageWithFallback
          uri={previewUri}
          title={title}
          className="mx-auto aspect-video max-h-[430px] w-full rounded-md bg-slate-100 object-contain"
          fallback={<StructuredPreview title={title} summary={version?.summary ?? family.conceptualSummary} />}
        />
      ) : (
        <StructuredPreview title={title} summary={version?.summary ?? family.conceptualSummary} />
      )}
      {(source || pageIndex) && (
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>{source ? `Source: ${source}` : "Source not returned"}</span>
          {pageIndex && <span>Page {pageIndex}</span>}
        </div>
      )}
    </Card>
  );
}

function StructuredPreview({ title, summary }: { title: string; summary?: string | null }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <h2 className="m-0 max-w-[14ch] text-[26px] font-bold leading-tight text-slate-950" style={{ letterSpacing: 0 }}>
          {title}
        </h2>
        <div className="mt-2 h-[3px] w-10 bg-blue-600" />
        {summary && <div className="muted mt-3 max-w-[32ch] text-[13px] leading-normal">{summary}</div>}
      </div>
      <SlideThumb title={title} brand="BB" variant="light" chart={false} big />
    </div>
  );
}

function IncludedPanel({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-xs uppercase text-slate-500" style={{ letterSpacing: "0.05em" }}>
          {title} <span className="count-inline">{count}</span>
        </b>
      </div>
      {children}
    </Card>
  );
}

function WorkProductsPanel({ partitions }: { partitions: WhereUsedPartitions }) {
  const count = partitions.workProducts.length + partitions.storyboards.length + partitions.contentBlocks.length;
  return (
    <IncludedPanel title="Included in WorkProducts" count={count}>
      <ReferenceRows items={partitions.workProducts} empty="Not referenced by any workproducts yet" />
      {partitions.storyboards.length > 0 && (
        <ReferenceGroup title="Storyboards">
          <ReferenceRows items={partitions.storyboards} empty="" />
        </ReferenceGroup>
      )}
      {partitions.contentBlocks.length > 0 && (
        <ReferenceGroup title="ContentBlocks">
          <ReferenceRows items={partitions.contentBlocks} empty="" />
        </ReferenceGroup>
      )}
      {partitions.other.length > 0 && (
        <ReferenceGroup title="Other References">
          <ReferenceRows items={partitions.other} empty="" />
        </ReferenceGroup>
      )}
    </IncludedPanel>
  );
}

function ReferenceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 border-t border-dashed border-slate-200 pt-2">
      <div className="mb-1 text-[10px] font-bold uppercase text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function ReferenceRows({ items, empty }: { items: ContentUnitWhereUsedReference[]; empty: string }) {
  if (items.length === 0) {
    if (!empty) return null;
    return <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">{empty}</div>;
  }
  return (
    <div className="grid gap-0 text-xs">
      {items.map((item, index) => (
        <Link
          key={`${item.objectType}-${item.objectId}-${item.slotId ?? item.orderIndex ?? index}`}
          href={referenceHref(item)}
          className="flex items-center gap-2 border-b border-dashed border-slate-200 py-1.5 last:border-0 hover:text-blue-700"
        >
          <ReferenceIcon type={item.objectType} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-800">{item.title ?? item.objectId}</div>
            <div className="muted text-[10px]">{item.objectType}</div>
          </div>
          {typeof item.orderIndex === "number" && <span className="muted mono text-[10px]">Page {item.orderIndex + 1}</span>}
        </Link>
      ))}
    </div>
  );
}

function ActionsPanel({ version }: { version?: ContentUnitVersionDetail }) {
  const sourceHref = provenanceLocation(version?.provenance);
  return (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-xs uppercase text-slate-500" style={{ letterSpacing: "0.05em" }}>
          Actions
        </b>
      </div>
      <div className="grid gap-1 text-xs">
        <Link href="/storyboards" className="link flex items-center gap-2 py-1">
          <Plus size={12} aria-hidden="true" /> Add to Deck
        </Link>
        <button type="button" className="link flex cursor-not-allowed items-center gap-2 py-1 opacity-55" disabled title="Coming soon">
          <FolderPlus size={12} aria-hidden="true" /> Add to Collection
        </button>
        <button type="button" className="link flex cursor-not-allowed items-center gap-2 py-1 opacity-55" disabled title="Plays are preview-only">
          <PlayCircle size={12} aria-hidden="true" /> Add to Play
        </button>
        {version?.renderUri && (
          <a href={assetUrl(version.renderUri)} download className="link flex items-center gap-2 py-1">
            <Download size={12} aria-hidden="true" /> Download Slide
          </a>
        )}
        {sourceHref && (
          <a href={assetUrl(sourceHref)} target="_blank" rel="noreferrer" className="link flex items-center gap-2 py-1">
            <ExternalLink size={12} aria-hidden="true" /> View Source File
          </a>
        )}
      </div>
    </Card>
  );
}

function AddToDeckSplit({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <div className="relative">
      <span className="btn-split">
        <Link href="/storyboards" className="btn btn-primary btn-sm">
          <Plus size={14} aria-hidden="true" /> Add to Deck
        </Link>
        <button type="button" className="btn btn-primary btn-sm" aria-label="Open Add to Deck menu" aria-expanded={open} onClick={() => onOpenChange(!open)}>
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </span>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg" role="menu">
          <Link href="/storyboards" role="menuitem" className="flex rounded px-3 py-2 hover:bg-slate-100">
            Add to Storyboard...
          </Link>
          <button type="button" role="menuitem" disabled className="flex w-full cursor-not-allowed rounded px-3 py-2 text-left opacity-55" title="Coming soon">
            Add to Collection
          </button>
        </div>
      )}
    </div>
  );
}

function CompareModal({ items, onClose }: { items: CompareItem[]; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ve-compare-title"
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="ve-compare-title" className="m-0 text-lg font-bold text-slate-950">
              Compare ContentUnits
            </h2>
            <p className="muted mt-1 text-sm">Side-by-side comparison uses the items already loaded in this explorer.</p>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close compare modal" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <ThumbWithFallback uri={item.previewUri} title={item.title} />
              <h3 className="mt-3 text-base font-bold text-slate-950">{item.title}</h3>
              {item.summary && <p className="muted mt-1 text-sm">{item.summary}</p>}
              <dl className="mt-4 grid grid-cols-[92px_1fr] gap-2 text-sm">
                <DetailLabel>Version</DetailLabel>
                <div>{item.versionNumber ?? "Not loaded"}</div>
                <DetailLabel>Approval</DetailLabel>
                <div>{item.approvalState ?? "Not loaded"}</div>
                <DetailLabel>Freshness</DetailLabel>
                <div>{item.freshnessState ?? "Not loaded"}</div>
                <DetailLabel>Updated</DetailLabel>
                <div>{formatDate(item.updatedAt)}</div>
              </dl>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingExplorer() {
  return (
    <div className="route-body">
      <div className="page-head-row">
        <div>
          <div className="h-7 w-80 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <div className="ve-rail" data-testid="ve-rail">
            <div className="ve-arrow animate-pulse" />
            <div className="ve-rail-track" style={railTrackStyle}>
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="ve-concept h-44 animate-pulse bg-slate-100">
                  <span className="sr-only">Loading similar concept</span>
                </div>
              ))}
            </div>
            <div className="ve-arrow animate-pulse" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid gap-2.5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="ve-variant h-36 animate-pulse bg-slate-100">
                  <span className="sr-only">Loading variation</span>
                </div>
              ))}
            </div>
            <Card className="h-96 animate-pulse bg-slate-100">
              <span className="sr-only">Loading preview</span>
            </Card>
          </div>
        </main>
        <aside data-testid="ve-details-rail" className="grid content-start gap-3.5">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="h-40 animate-pulse bg-slate-100">
              <span className="sr-only">Loading detail panel</span>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}

function ErrorExplorer({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="route-body">
      <h1 className="m-0 text-2xl font-bold text-slate-950">ContentUnit Variation Explorer</h1>
      <Card className="mt-5 border-red-200 bg-red-50 p-5 text-red-900">
        <div className="font-bold">ContentUnit request failed</div>
        <p className="mt-1 text-sm">{message}</p>
        <Button className="mt-3" onClick={retry}>
          Retry
        </Button>
      </Card>
    </div>
  );
}

function RestrictedExplorer() {
  return (
    <div className="route-body">
      <h1 className="m-0 text-2xl font-bold text-slate-950">Restricted ContentUnit</h1>
      <Card className="mt-5 border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="font-bold">Access restricted</div>
        <p className="m-0 mt-1 text-sm">No preview, snippets, provenance, similar items, or where-used references are shown for restricted content.</p>
      </Card>
    </div>
  );
}

function NotFoundExplorer({ message }: { message: string }) {
  return (
    <div className="route-body">
      <h1 className="m-0 text-2xl font-bold text-slate-950">ContentUnit not found</h1>
      <Card className="mt-5 p-5 text-sm text-slate-600">{message}</Card>
    </div>
  );
}

function EmptyExplorer({ retry }: { retry: () => void }) {
  return (
    <div className="route-body">
      <h1 className="m-0 text-2xl font-bold text-slate-950">ContentUnit Variation Explorer</h1>
      <Card className="mt-5 p-5 text-sm text-slate-600">
        <div className="font-bold text-slate-900">No ContentUnit families returned</div>
        <p className="mt-1">The explorer needs at least one accessible family before it can resolve a selected version.</p>
        <Button className="mt-3" onClick={retry}>
          Retry
        </Button>
      </Card>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <b className="text-xs uppercase text-slate-500" style={{ letterSpacing: "0.05em" }}>
      {children}
    </b>
  );
}

function DetailLabel({ children }: { children: ReactNode }) {
  return <div className="muted">{children}</div>;
}

function MetricBar({ label, value, tone, className }: { label: string; value: number; tone: "ok" | "primary"; className?: string }) {
  const color = tone === "ok" ? "var(--ok)" : "var(--primary)";
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <span className={tone === "ok" ? "font-semibold text-emerald-600" : "muted"}>{label}</span>
        <b>{value}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-100">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function StatusRow({ version }: { version: ContentUnitVersionDetail }) {
  return (
    <>
      <StatusBadge tone={approvalTone(version.approvalState)}>{version.approvalState}</StatusBadge>
      {version.freshnessState && <StatusBadge tone={freshnessTone(version.freshnessState)}>{version.freshnessState}</StatusBadge>}
    </>
  );
}

function ReferenceIcon({ type }: { type: string }) {
  if (type.includes("work")) return <Files size={13} aria-hidden="true" />;
  if (type.includes("story")) return <PanelTop size={13} aria-hidden="true" />;
  if (type.includes("block")) return <Layers size={13} aria-hidden="true" />;
  return <PlayCircle size={13} aria-hidden="true" />;
}

function ThumbWithFallback({ uri, title }: { uri?: string | null; title: string }) {
  return (
    <ImageWithFallback
      uri={uri}
      title={title}
      className="aspect-video w-full rounded bg-slate-100 object-cover"
      fallback={<SlideThumb title={title} variant="light" brand="BB" />}
    />
  );
}

function ImageWithFallback({ uri, title, className, fallback }: { uri?: string | null; title: string; className: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <>{fallback}</>;
  // API asset hosts are runtime-configured; this screen cannot update shared Next image allowlists.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={assetUrl(uri)} alt={`${title} preview`} className={className} onError={() => setFailed(true)} />;
}

async function loadExplorer(params: ExplorerParams): Promise<ExplorerState> {
  const familyEnvelope = await boxbrainApi.listContentUnitFamilies({});
  const families = familyEnvelope.items;
  if (families.length === 0) return { status: "empty" };

  if (params.version) {
    const version = await boxbrainApi.getContentUnitVersion(params.version);
    const familyId = params.family ?? (await findFamilyIdForVariant(version.variantId, families));
    if (familyId) {
      return buildDataForFamily({
        families,
        familyId,
        variantId: version.variantId,
        selectedVersion: version
      });
    }
  }

  return buildDataForFamily({
    families,
    familyId: params.family ?? families[0].id,
    variantId: params.variant
  });
}

async function buildDataForFamily({
  families,
  familyId,
  variantId,
  selectedVersion
}: {
  families: ContentUnitFamilyCard[];
  familyId: string;
  variantId?: string;
  selectedVersion?: ContentUnitVersionDetail;
}): Promise<ExplorerState> {
  const family = await boxbrainApi.getContentUnitFamily(familyId);
  const variants = family.variants?.length ? family.variants : (await boxbrainApi.listContentUnitVariants(family.id)).items;
  const versionsByVariant = await loadVersionsByVariant(variants);
  const selectedVariant = variants.find((variant) => variant.id === (selectedVersion?.variantId ?? variantId)) ?? variants.find((variant) => variant.isCanonical) ?? variants[0];
  const selectedVersionId = selectedVersion?.id ?? selectedVersionIdForVariant(selectedVariant, versionsByVariant);
  const detail = selectedVersion ?? (selectedVersionId ? await boxbrainApi.getContentUnitVersion(selectedVersionId) : undefined);
  const [similar, whereUsed] = detail
    ? await Promise.all([boxbrainApi.listSimilarContentUnits(detail.id), boxbrainApi.listContentUnitWhereUsed(detail.id)])
    : [[], [] as ContentUnitWhereUsedReference[]];

  return {
    status: "ready",
    data: {
      families,
      family,
      variants,
      versionsByVariant,
      selectedVariant,
      selectedVersion: detail,
      similar,
      whereUsed,
      resolved: {
        family: family.id,
        variant: selectedVariant?.id,
        version: detail?.id
      }
    }
  };
}

async function loadVersionsByVariant(variants: ContentUnitVariant[]) {
  const entries = await Promise.all(
    variants.map(async (variant) => {
      const versions = (await boxbrainApi.listContentUnitVersions(variant.id)).items;
      return [variant.id, versions] as const;
    })
  );
  return Object.fromEntries(entries);
}

async function findFamilyIdForVariant(variantId: string, families: ContentUnitFamilyCard[]) {
  const variantGroups = await Promise.all(
    families.map(async (family) => {
      try {
        return (await boxbrainApi.listContentUnitVariants(family.id)).items;
      } catch {
        return [];
      }
    })
  );
  return variantGroups.flat().find((variant) => variant.id === variantId)?.familyId;
}

function buildRailItems(data: ExplorerData): RailItem[] {
  const current: RailItem = {
    kind: "current",
    id: data.selectedVersion?.id ?? data.family.id,
    title: data.family.familyTitle,
    summary: data.selectedVersion?.summary ?? data.family.conceptualSummary,
    previewUri: data.selectedVersion?.thumbnailUri ?? data.selectedVersion?.renderUri ?? data.family.canonicalPreviewUri,
    version: data.selectedVersion,
    statusChips: data.family.statusChips
  };
  return [
    current,
    ...data.similar.map((item) => ({
      kind: "similar" as const,
      id: item.objectId,
      title: item.title,
      summary: item.summary,
      previewUri: item.previewUri,
      score: normalizeSimilarityScore(item.score),
      raw: item,
      statusChips: item.statusChips
    }))
  ];
}

function classifyLoadError(error: unknown): ExplorerState {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return { status: "restricted" };
    if (error.status === 404) return { status: "not_found", message: "The API did not return a family or version for this explorer selection." };
    return { status: "error", message: error.message };
  }
  return { status: "error", message: error instanceof Error ? error.message : "The ContentUnit explorer request failed." };
}

function selectedVersionIdForVariant(variant?: ContentUnitVariant, versionsByVariant?: Record<string, ContentUnitVersion[]>) {
  if (!variant) return undefined;
  if (variant.latestVersionId) return variant.latestVersionId;
  if (variant.latestVersion?.id) return variant.latestVersion.id;
  return versionsByVariant?.[variant.id]?.[0]?.id;
}

function anchorFromRail(railItems: RailItem[], direction: -1 | 1, replaceExplorerParams: (params: ExplorerParams) => void) {
  if (railItems.length <= 1) return;
  const target = direction > 0 ? railItems[1] : railItems[railItems.length - 1];
  if (target.kind === "similar") replaceExplorerParams({ version: target.id });
}

function focusIndexedCard(container: HTMLElement | null, current: number, delta: number, count: number, kind: "rail" | "variation") {
  if (count === 0) return 0;
  const next = (current + delta + count) % count;
  window.setTimeout(() => {
    const attribute = kind === "rail" ? "data-rail-index" : "data-variation-index";
    container?.querySelector<HTMLElement>(`[${attribute}="${next}"]`)?.focus();
  }, 0);
  return next;
}

function similarityStats(items: SearchResultItem[]) {
  const scores = items.map((item) => normalizeSimilarityScore(item.score));
  if (scores.length === 0) return { best: 0, average: 0 };
  const best = Math.max(...scores);
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return { best, average };
}

function compareFromVersion(version: ContentUnitVersionDetail, title: string): CompareItem {
  return {
    id: version.id,
    title,
    summary: version.summary,
    previewUri: version.thumbnailUri ?? version.renderUri,
    versionNumber: version.versionNumber,
    approvalState: version.approvalState,
    freshnessState: version.freshnessState,
    updatedAt: version.createdAt
  };
}

function compareFromSearchResult(item: SearchResultItem): CompareItem {
  return {
    id: item.objectId,
    title: item.title,
    summary: item.summary,
    previewUri: item.previewUri,
    approvalState: item.statusChips?.approvalState,
    freshnessState: item.statusChips?.freshnessState
  };
}

function compareFromVariation(item: VariationStackItem): CompareItem {
  return {
    id: item.id,
    title: item.subtitle,
    summary: item.summary,
    previewUri: item.previewUri,
    versionNumber: item.version?.versionNumber,
    approvalState: item.version?.approvalState,
    freshnessState: item.version?.freshnessState,
    updatedAt: item.version?.createdAt
  };
}

function taxonomyTags(taxonomy?: Taxonomy) {
  if (!taxonomy) return [];
  const values = Object.values(taxonomy)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).slice(0, 8);
}

function approvalTone(value?: string) {
  if (value === "approved") return "ok";
  if (value === "review" || value === "needs_review") return "warn";
  if (value === "draft") return "neutral";
  if (value === "deprecated" || value === "archived") return "danger";
  return "neutral";
}

function freshnessTone(value?: string) {
  if (value === "fresh") return "ok";
  if (value === "stale") return "warn";
  return "neutral";
}

function provenanceSource(provenance?: ProvenanceRecord) {
  return provenance?.sourceRefs?.find((value) => value.trim().length > 0) ?? provenance?.sourceSystem ?? provenance?.originType;
}

function provenanceLocation(provenance?: ProvenanceRecord) {
  if (!provenance) return undefined;
  for (const key of ["sourceUri", "sourceURI", "uri", "path", "filePath", "location"]) {
    const value = provenance[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function actorText(version?: ContentUnitVersionDetail) {
  for (const key of ["updatedBy", "actor", "createdBy"]) {
    const value = version?.[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function formatDate(value?: string) {
  if (!value) return "Not returned";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not returned";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function referenceHref(item: ContentUnitWhereUsedReference) {
  if (item.objectType === "storyboard") return `/storyboards/${item.objectId}`;
  if (item.objectType === "content_block_version") return `/content-blocks/${item.objectId}`;
  if (item.objectType === "work_product_version" || item.objectType === "work_product" || item.objectType === "workproduct") return `/work-products/${item.objectId}`;
  return "/library";
}

function explorerHref(pathname: string, params: ExplorerParams) {
  const next = new URLSearchParams();
  if (params.family) next.set("family", params.family);
  if (params.variant) next.set("variant", params.variant);
  if (params.version) next.set("version", params.version);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function cleanParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
