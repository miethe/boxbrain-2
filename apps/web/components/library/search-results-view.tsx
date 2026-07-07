"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Grid2X2, Info, List, Sparkles, X } from "lucide-react";
import { Button, Card, EmptyState, IconButton, ScorePill, StatusBadge, Tabs } from "@/components/ui";
import { boxbrainApi, type SearchResultItem } from "@/lib/api";
import { approvalTone, freshnessTone, toPercent } from "@/features/library/format";
import type { LibraryViewMode, LoadState, SearchSelectionEntry } from "@/features/library/types";

type ObjectTypeGroup = "content_unit" | "work_product" | "content_block";

const groupLabels: Record<ObjectTypeGroup, string> = {
  content_unit: "Content Units",
  work_product: "Work Products",
  content_block: "Content Blocks"
};

function groupFor(objectType: string): ObjectTypeGroup {
  if (objectType.startsWith("work_product")) return "work_product";
  if (objectType.startsWith("content_block")) return "content_block";
  return "content_unit";
}

function hrefFor(item: SearchResultItem) {
  const group = groupFor(item.objectType);
  if (group === "work_product") return `/work-products/${item.objectId}`;
  if (group === "content_block") return `/content-blocks/${item.objectId}`;
  return `/content-units/${item.objectId}`;
}

export function SearchResultsView({ query, onClear }: { query: string; onClear: () => void }) {
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [typeFilter, setTypeFilter] = useState<ObjectTypeGroup[]>([]);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [resultsMode, setResultsMode] = useState<"unified" | "grouped">("unified");
  const [sort, setSort] = useState<"relevance" | "title">("relevance");
  const [view, setView] = useState<LibraryViewMode>("grid");
  const [selection, setSelection] = useState<SearchSelectionEntry[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    boxbrainApi
      .searchBoxBrain({
        query,
        limit: 48,
        objectTypes: typeFilter.length > 0 ? typeFilter : undefined,
        profile: approvedOnly ? "approved_only" : "general"
      })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setState(response.items.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, typeFilter, approvedOnly]);

  const facetCounts = useMemo(() => {
    const counts: Record<ObjectTypeGroup, number> = { content_unit: 0, work_product: 0, content_block: 0 };
    for (const item of items) counts[groupFor(item.objectType)] += 1;
    return counts;
  }, [items]);

  const sorted = useMemo(() => (sort === "title" ? [...items].sort((a, b) => a.title.localeCompare(b.title)) : items), [items, sort]);

  function toggleType(group: ObjectTypeGroup) {
    setTypeFilter((prev) => (prev.includes(group) ? prev.filter((entry) => entry !== group) : [...prev, group]));
  }

  function toggleSelect(item: SearchResultItem) {
    setSelection((prev) => {
      if (prev.some((entry) => entry.objectId === item.objectId)) return prev.filter((entry) => entry.objectId !== item.objectId);
      if (prev.length >= 6) return prev;
      return [...prev, { key: item.objectId, objectId: item.objectId, objectType: item.objectType, title: item.title, score: item.score, previewUri: item.previewUri, statusChips: item.statusChips }];
    });
  }

  const activeFilterCount = typeFilter.length + (approvedOnly ? 1 : 0);

  return (
    <div data-testid="library-search-results">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-3">
        <div>
          <b className="text-[15px]">
            {state === "ready" || state === "empty" ? sorted.length : "…"} results for &ldquo;{query}&rdquo;
          </b>
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[var(--ink-4)]" title="The search API does not return a total corpus count, so this reflects only the returned page.">
            <Info size={11} /> ranked by relevance
          </span>
        </div>
        <button type="button" className="icon-btn borderless" aria-label="Exit search results" onClick={onClear}>
          <X size={16} />
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {typeFilter.map((group) => (
            <span key={group} className="chip active text-[11px]">
              {groupLabels[group]}{" "}
              <button type="button" onClick={() => toggleType(group)} aria-label={`Remove ${groupLabels[group]} filter`}>
                <X size={10} />
              </button>
            </span>
          ))}
          {approvedOnly && (
            <span className="chip active text-[11px]">
              Approved only{" "}
              <button type="button" onClick={() => setApprovedOnly(false)} aria-label="Remove approved-only filter">
                <X size={10} />
              </button>
            </span>
          )}
          <button
            type="button"
            className="link"
            onClick={() => {
              setTypeFilter([]);
              setApprovedOnly(false);
            }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-3">
        <Tabs
          tabs={[
            { id: "unified", label: "Unified results" },
            {
              id: "grouped",
              label: (
                <span className="flex items-center gap-1.5">
                  Grouped by topic <span className="tag ai sm">New</span>
                </span>
              )
            }
          ]}
          active={resultsMode}
          onChange={(id) => setResultsMode(id as "unified" | "grouped")}
        />
      </div>

      {resultsMode === "grouped" ? (
        <div className="mt-4">
          <EmptyState
            title="Topic clustering is not available yet"
            body="The search API only supports family/variant/version result modes today — there is no topic-clustering mode, so this view cannot be populated honestly. Switch back to Unified results."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-5" style={{ gridTemplateColumns: "200px 1fr" }}>
          <Card className="self-start p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--ink-3)]">Object Type</div>
            {(Object.keys(groupLabels) as ObjectTypeGroup[]).map((group) => (
              <label key={group} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
                <input type="checkbox" checked={typeFilter.includes(group)} onChange={() => toggleType(group)} />
                <span className="min-w-0 flex-1 truncate">{groupLabels[group]}</span>
                <span className="text-[11px] text-[var(--ink-3)]">{facetCounts[group]}</span>
              </label>
            ))}
            <div className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--ink-3)]">Approval</div>
            <label className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
              <input type="checkbox" checked={approvedOnly} onChange={(event) => setApprovedOnly(event.target.checked)} />
              <span>Approved only</span>
            </label>
            <p className="m-0 mt-3 text-[11px] text-[var(--ink-4)]">
              Offering, Technology, Audience, and Rating facets are not returned on search results, so they are intentionally omitted rather than shown with fake
              counts.
            </p>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-end gap-2">
              <div className="select-wrap">
                <select aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value as "relevance" | "title")}>
                  <option value="relevance">Sort: Relevance</option>
                  <option value="title">Sort: Title A-Z</option>
                </select>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
                <IconButton label="Grid view" borderless onClick={() => setView("grid")} style={view === "grid" ? { background: "var(--primary-bg)", color: "var(--primary)" } : undefined}>
                  <Grid2X2 size={14} />
                </IconButton>
                <IconButton label="List view" borderless onClick={() => setView("list")} style={view === "list" ? { background: "var(--primary-bg)", color: "var(--primary)" } : undefined}>
                  <List size={14} />
                </IconButton>
              </div>
            </div>

            {state === "loading" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading search results">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-40 animate-pulse rounded-lg bg-[var(--bg-2)]" />
                ))}
              </div>
            )}
            {state === "error" && (
              <Card className="border-red-200 bg-red-50 p-5 text-red-900">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold">Search request failed</div>
                    <p className="m-0 mt-1 text-sm">The live search API could not be reached for this query.</p>
                  </div>
                </div>
              </Card>
            )}
            {state === "empty" && <EmptyState title="No results" body={`No catalog items matched "${query}" with the active filters.`} />}
            {(state === "ready" || (state === "empty" && sorted.length > 0)) && sorted.length > 0 && (
              <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
                {sorted.map((item) => (
                  <ResultCard key={item.objectId} item={item} view={view} selected={selection.some((entry) => entry.objectId === item.objectId)} onToggleSelect={() => toggleSelect(item)} />
                ))}
              </div>
            )}
            {(state === "ready" || state === "empty") && (
              <p className="m-0 mt-4 text-center text-xs text-[var(--ink-4)]">
                Showing {sorted.length} result{sorted.length === 1 ? "" : "s"} returned. Full pagination (total count, page size) requires backend support that does
                not exist yet.
              </p>
            )}
          </div>
        </div>
      )}

      {selection.length > 0 && (
        <div className="fixed inset-x-6 bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2.5 shadow-[var(--shadow-lg)] lg:inset-x-[280px]">
          <b className="px-1 text-xs">{selection.length} selected</b>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {selection.map((entry) => (
              <span key={entry.key} className="flex items-center gap-1 rounded-md bg-[var(--bg-2)] px-2 py-1 text-[11px]">
                <span className="max-w-[140px] truncate">{entry.title}</span>
                <button type="button" onClick={() => setSelection((prev) => prev.filter((e) => e.key !== entry.key))} aria-label={`Remove ${entry.title}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <Button size="sm" variant="ghost" disabled title="Adding to a Play requires a Play backend that does not exist yet.">
            Add to Play
          </Button>
          <Button size="sm" variant="ghost" disabled title="Adding to a Workspace requires a Workspace backend that does not exist yet.">
            Add to Workspace
          </Button>
          <Button size="sm" onClick={() => setCompareOpen(true)} disabled={selection.length < 2}>
            Compare ({selection.length})
          </Button>
          <IconButton label="Clear selection" borderless onClick={() => setSelection([])}>
            <X size={14} />
          </IconButton>
        </div>
      )}

      {compareOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Compare selected search results">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-center justify-between">
              <b className="text-sm">Compare — {selection.length} items selected</b>
              <IconButton label="Close compare view" borderless onClick={() => setCompareOpen(false)}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(selection.length, 4) || 1}, minmax(0, 1fr))` }}>
              {selection.map((entry) => (
                <div key={entry.key} className="compare-card">
                  <div className="text-sm font-semibold">{entry.title}</div>
                  <div className="text-xs text-[var(--ink-3)]">{groupLabels[groupFor(entry.objectType)]}</div>
                  <ScorePill value={toPercent(entry.score)} label="match" />
                  {entry.statusChips?.approvalState && <StatusBadge tone={approvalTone(entry.statusChips.approvalState)}>{entry.statusChips.approvalState}</StatusBadge>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  item,
  view,
  selected,
  onToggleSelect
}: {
  item: SearchResultItem;
  view: LibraryViewMode;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const href = hrefFor(item);
  if (view === "list") {
    return (
      <div className="list-row" data-testid="library-search-result">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${item.title} for comparison`} />
        <Link href={href} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--ink)]">{item.title}</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--ink-4)]">{groupLabels[groupFor(item.objectType)]}</span>
        </Link>
        {item.statusChips?.approvalState && <StatusBadge tone={approvalTone(item.statusChips.approvalState)}>{item.statusChips.approvalState}</StatusBadge>}
        <ScorePill value={toPercent(item.score)} label="match" />
      </div>
    );
  }
  return (
    <Card className="p-3" data-testid="library-search-result">
      <div className="mb-2 flex items-center justify-between">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${item.title} for comparison`} />
        <ScorePill value={toPercent(item.score)} label="match" />
      </div>
      <Link href={href} className="text-sm font-bold leading-snug hover:text-[var(--primary)]">
        {item.title}
      </Link>
      <div className="mt-1 flex flex-wrap gap-1">
        <StatusBadge tone="neutral">{groupLabels[groupFor(item.objectType)]}</StatusBadge>
        {item.statusChips?.approvalState && <StatusBadge tone={approvalTone(item.statusChips.approvalState)}>{item.statusChips.approvalState}</StatusBadge>}
        {item.statusChips?.freshnessState && <StatusBadge tone={freshnessTone(item.statusChips.freshnessState)}>{item.statusChips.freshnessState}</StatusBadge>}
      </div>
      {item.summary && <p className="m-0 mt-1.5 line-clamp-2 text-[11px] text-[var(--ink-4)]">{item.summary}</p>}
      {(item.explanationChips ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(item.explanationChips ?? []).slice(0, 3).map((chip) => (
            <span key={chip} className="tag ai sm flex items-center gap-1">
              <Sparkles size={9} /> {chip}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
