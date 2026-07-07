"use client";

import { AlertCircle, ChevronDown, DatabaseZap, FileText, Grid as GridIcon, Layers, List as ListIcon, Presentation, Route, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Card, EmptyState, SectionHead, Tabs } from "@/components/ui";
import type { SearchResultItem } from "@/lib/api";
import { ASK_RESULT_TABS, countByTab, itemsForTab, type AskResultTabId } from "@/features/ask/lib";
import { SearchResultCard } from "@/components/search-result-card";

export type AskLoadState = "idle" | "loading" | "ready" | "empty" | "error" | "restricted";
export type AskResultView = "grid" | "list";

const SECTION_META: Record<Exclude<AskResultTabId, "all">, { label: string; icon: ReactNode }> = {
  slides: { label: "Slides", icon: <Presentation size={14} color="var(--primary)" /> },
  blocks: { label: "Content Blocks", icon: <Layers size={14} color="var(--primary)" /> },
  workproducts: { label: "Work Products", icon: <FileText size={14} color="var(--primary)" /> },
  plays: { label: "Plays", icon: <Route size={14} color="var(--primary)" /> }
};

const PREVIEW_CAP: Record<Exclude<AskResultTabId, "all">, number> = {
  slides: 6,
  blocks: 3,
  workproducts: 3,
  plays: 3
};

export function AskResultsPanel({
  loadState,
  errorMessage,
  visibleItems,
  activeTab,
  onTabChange,
  view,
  onViewChange,
  showDebug,
  debugPayload,
  onLoadMore,
  loadingMore,
  isItemSelected,
  onToggleSelection
}: {
  loadState: AskLoadState;
  errorMessage: string | null;
  visibleItems: SearchResultItem[];
  activeTab: AskResultTabId;
  onTabChange: (tab: AskResultTabId) => void;
  view: AskResultView;
  onViewChange: (view: AskResultView) => void;
  showDebug: boolean;
  debugPayload?: Record<string, unknown> | null;
  onLoadMore: () => void;
  loadingMore: boolean;
  isItemSelected: (id: string) => boolean;
  onToggleSelection: (item: SearchResultItem) => void;
}) {
  const counts = countByTab(visibleItems);
  const tabs = ASK_RESULT_TABS.map((tab) => ({ id: tab.id, label: tab.label, count: counts[tab.id] }));
  const topRankedId = visibleItems[0]?.objectId;
  const sections: Array<Exclude<AskResultTabId, "all">> = activeTab === "all" ? ["slides", "blocks", "workproducts", "plays"] : [activeTab];

  return (
    <div className="grid content-start gap-3" data-testid="ask-results-panel">
      <div className="page-head-row">
        <div className="flex items-baseline gap-3">
          <h2 className="m-0 text-lg font-semibold">Top results</h2>
          {loadState === "ready" && (
            <span className="muted text-[13px]" data-testid="ask-result-count">
              {visibleItems.length} result{visibleItems.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="muted text-[13px]">
            Sort by: <b className="text-[var(--ink)]">Relevance</b>
          </span>
          <span className="muted text-[13px]">View</span>
          <button type="button" className="icon-btn" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => onViewChange("grid")}>
            <GridIcon size={14} />
          </button>
          <button type="button" className="icon-btn" aria-pressed={view === "list"} aria-label="List view" onClick={() => onViewChange("list")}>
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => onTabChange(id as AskResultTabId)} />

      <ResultStateBanner state={loadState} errorMessage={errorMessage} />

      {loadState === "ready" &&
        sections.map((tabId) => {
          const items = itemsForTab(visibleItems, tabId);
          if (items.length === 0 && activeTab === "all") return null;
          return (
            <ResultSection
              key={tabId}
              tabId={tabId}
              items={items}
              expanded={activeTab !== "all"}
              view={view}
              onSeeAll={() => onTabChange(tabId)}
              topRankedId={topRankedId}
              showDebug={showDebug}
              isItemSelected={isItemSelected}
              onToggleSelection={onToggleSelection}
            />
          );
        })}

      {loadState === "ready" && (
        <div className="flex justify-center py-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLoadMore} disabled={loadingMore} data-testid="ask-load-more">
            <ChevronDown size={14} /> {loadingMore ? "Loading…" : "Show more results"}
          </button>
        </div>
      )}

      {showDebug && debugPayload !== undefined && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <DatabaseZap size={15} /> Debug
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(debugPayload, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}

function ResultSection({
  tabId,
  items,
  expanded,
  view,
  onSeeAll,
  topRankedId,
  showDebug,
  isItemSelected,
  onToggleSelection
}: {
  tabId: Exclude<AskResultTabId, "all">;
  items: SearchResultItem[];
  expanded: boolean;
  view: AskResultView;
  onSeeAll: () => void;
  topRankedId?: string;
  showDebug: boolean;
  isItemSelected: (id: string) => boolean;
  onToggleSelection: (item: SearchResultItem) => void;
}) {
  const meta = SECTION_META[tabId];
  const cap = PREVIEW_CAP[tabId];
  const visible = expanded ? items : items.slice(0, cap);
  const hasMore = !expanded && items.length > cap;

  if (items.length === 0) {
    if (!expanded) return null;
    return (
      <div>
        <SectionHead>
          {meta.icon}
          {meta.label.toUpperCase()}
        </SectionHead>
        {tabId === "plays" ? (
          <EmptyState
            title="Plays aren't indexed for search yet"
            body="The search backend does not have a Plays document source wired up yet, so this tab always returns zero governed hits regardless of query. Browse Plays directly from the sidebar in the meantime."
          />
        ) : (
          <EmptyState title={`No ${meta.label.toLowerCase()} matched`} body="Try a broader query or clear a filter chip above." />
        )}
      </div>
    );
  }

  const useTiles = tabId === "slides" && view === "grid";

  return (
    <div>
      <SectionHead
        action={
          hasMore && (
            <button type="button" className="link" onClick={onSeeAll}>
              See all {items.length}
            </button>
          )
        }
      >
        {meta.icon}
        {meta.label.toUpperCase()}
      </SectionHead>
      <div className={useTiles ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
        {visible.map((item) => (
          <SearchResultCard
            key={`${item.objectType}-${item.objectId}`}
            item={item}
            layout={useTiles ? "tile" : "row"}
            rank={item.objectId === topRankedId ? 1 : undefined}
            showDebug={showDebug}
            selected={isItemSelected(item.objectId)}
            onToggleSelect={() => onToggleSelection(item)}
          />
        ))}
      </div>
    </div>
  );
}

function ResultStateBanner({ state, errorMessage }: { state: AskLoadState; errorMessage: string | null }) {
  if (state === "ready") return null;
  if (state === "loading") {
    return (
      <Card className="p-4">
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid animate-pulse gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
              <div className="aspect-video rounded-lg bg-slate-200" />
              <div className="grid content-center gap-2">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (state === "restricted") {
    return (
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No search titles, previews, snippets, or debug payloads are shown for this user.</p>
          </div>
        </div>
      </Card>
    );
  }
  if (state === "error") {
    return (
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Retrieval request failed</div>
            <p className="m-0 mt-1 text-sm">{errorMessage ?? "The API did not return a usable response."}</p>
          </div>
        </div>
      </Card>
    );
  }
  if (state === "empty") {
    return <EmptyState title="No visible results" body="No items matched the current query, filters, and viewer permissions." />;
  }
  return <EmptyState title="No search submitted" body="Run a query to retrieve governed results from the live BoxBrain API." />;
}
