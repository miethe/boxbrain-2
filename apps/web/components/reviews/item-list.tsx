"use client";

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { normalizeReviewAction, type ReviewItem } from "@/lib/api";
import { ACTION_LABELS } from "@/features/reviews/constants";
import { confidencePercent, confidenceWord, formatRelative, queueLabel, scoreTone } from "@/features/reviews/format";
import { targetVersionId } from "@/features/reviews/target-ids";
import type { LoadState, SortKey, VersionCacheEntry } from "@/features/reviews/types";
import { ErrorState, LoadingCard, RestrictedCopy } from "./shared";

const PAGE_SIZE = 5;

type EnrichedRow = {
  item: ReviewItem;
  firstVersionId?: string;
  secondVersionId?: string;
  title: string;
  detailLine: string;
  vsLine?: string;
};

export function ReviewItemListPanel({
  items,
  state,
  errorMessage,
  selectedItemId,
  onSelect,
  totalOpenCount,
  versionCache,
  ensureVersion
}: {
  items: ReviewItem[];
  state: LoadState;
  errorMessage: string | null;
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  totalOpenCount: number;
  versionCache: Record<string, VersionCacheEntry>;
  ensureVersion: (versionId?: string | null) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [minConfidence, setMinConfidence] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const enrichedRows = useMemo<EnrichedRow[]>(() => items.map((item) => buildRow(item, versionCache)), [items, versionCache]);

  const filtered = useMemo(() => enrichedRows.filter((row) => confidencePercent(row.item.confidence) >= minConfidence), [enrichedRows, minConfidence]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sortKey === "confidence") return confidencePercent(b.item.confidence) - confidencePercent(a.item.confidence);
      if (sortKey === "updated") return new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });
    return copy;
  }, [filtered, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    // Reset paging whenever the underlying (queue-filtered) item set changes.
  }, [items]);

  useEffect(() => {
    for (const row of pageRows) {
      ensureVersion(row.firstVersionId);
      ensureVersion(row.secondVersionId);
    }
    // Only the visible page needs enrichment fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedPage, sorted.length, ensureVersion]);

  return (
    <div data-testid="reviews-item-list" className="grid content-start gap-3">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5">
          <b className="text-[13px]">
            {sorted.length} item{sorted.length === 1 ? "" : "s"}
          </b>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            Sort by:
            <div className="select-wrap text-[11px]">
              <select className="h-6 py-0.5 pl-1.5 pr-4 text-[11px]" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} aria-label="Sort review items">
                <option value="confidence">AI Confidence</option>
                <option value="updated">Updated</option>
                <option value="title">Title</option>
              </select>
            </div>
            <button type="button" className="icon-btn borderless h-5 w-5" aria-label="Filter results by confidence" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
              <Filter size={11} />
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px]">
            <label className="flex items-center justify-between gap-2">
              Minimum confidence
              <select className="h-6 rounded border border-slate-200 px-1 text-[11px]" value={minConfidence} onChange={(event) => setMinConfidence(Number(event.target.value))}>
                <option value={0}>All</option>
                <option value={55}>Medium+ (55%)</option>
                <option value={80}>High only (80%)</option>
              </select>
            </label>
          </div>
        )}

        <div className="max-h-[620px] overflow-auto">
          {state === "loading" && <LoadingCard title="Loading review items" body="Fetching queue records and the first compare detail." />}
          {state === "restricted" && <RestrictedCopy />}
          {state === "error" && <ErrorState message={errorMessage ?? "Review items failed to load."} />}
          {state === "empty" && <EmptyState title="No open review items" body="This queue has no open items right now. Generate candidates to run a scan, or switch queues." />}
          {state === "ready" && pageRows.length === 0 && <EmptyState title="No items match this filter" body="Loosen the confidence filter to see more results." />}
          {state === "ready" && pageRows.map((row) => <ReviewItemRow key={row.item.id} row={row} active={row.item.id === selectedItemId} onClick={() => onSelect(row.item.id)} />)}
        </div>

        {state === "ready" && sorted.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3.5 py-2.5 text-[11px] text-slate-500">
            <span>
              Showing {(clampedPage - 1) * PAGE_SIZE + 1} to {Math.min(clampedPage * PAGE_SIZE, sorted.length)} of {sorted.length} results
              {totalOpenCount > items.length && <span className="mt-0.5 block text-[10px] text-slate-400">{totalOpenCount} total open in this queue · {items.length} loaded this batch</span>}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" className="icon-btn h-[22px] w-[22px]" aria-label="Previous page" disabled={clampedPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft size={10} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="icon-btn h-[22px] w-[22px] text-[11px]"
                  style={n === clampedPage ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : undefined}
                  aria-current={n === clampedPage ? "page" : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" className="icon-btn h-[22px] w-[22px]" aria-label="Next page" disabled={clampedPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                <ChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function buildRow(item: ReviewItem, cache: Record<string, VersionCacheEntry>): EnrichedRow {
  const firstVersionId = targetVersionId(item.targetRefs[0]);
  const secondVersionId = targetVersionId(item.targetRefs[1]);
  const firstEntry = firstVersionId ? cache[firstVersionId] : undefined;
  const secondEntry = secondVersionId ? cache[secondVersionId] : undefined;
  const first = firstEntry?.status === "ready" ? firstEntry.data : undefined;
  const second = secondEntry?.status === "ready" ? secondEntry.data : undefined;

  const fallbackTitle = `${ACTION_LABELS[normalizeReviewAction(item.suggestedAction)]} review`;
  const title = first?.summary?.trim() || fallbackTitle;
  const detailLine = [queueLabel(item.queueType), first?.versionNumber ? `Version ${first.versionNumber}` : undefined].filter(Boolean).join(" · ");
  const vsLine = second?.summary?.trim();

  return { item, firstVersionId, secondVersionId, title, detailLine, vsLine };
}

function ReviewItemRow({ row, active, onClick }: { row: EnrichedRow; active: boolean; onClick: () => void }) {
  const confidence = confidencePercent(row.item.confidence);
  const tone = scoreTone(confidence);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`list-row items-start gap-2.5 !px-3.5 !py-3 text-left ${active ? "active" : ""}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ border: `2px solid var(--${tone})`, background: scoreBg(tone), color: `var(--${tone})` }} aria-hidden="true">
        {confidence}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-slate-900">{row.title}</span>
          <span className="muted ml-auto shrink-0 whitespace-nowrap text-[10px]">{formatRelative(row.item.createdAt)}</span>
        </span>
        <span className="mb-0.5 block truncate text-[11px] text-slate-500">{row.detailLine}</span>
        {row.vsLine && (
          <span className="block truncate text-[11px] text-slate-500">
            vs. <span className="text-slate-700">{row.vsLine}</span>
          </span>
        )}
        <span className="mt-1 inline-block text-[10px] font-semibold" style={{ color: `var(--${tone})` }}>
          {confidenceWord(confidence)}
        </span>
      </span>
    </button>
  );
}

function scoreBg(tone: "ok" | "primary" | "warn" | "danger") {
  return { ok: "#ecfdf5", primary: "var(--primary-bg)", warn: "#fef3c7", danger: "#fee2e2" }[tone];
}
