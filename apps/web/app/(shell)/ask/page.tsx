"use client";

import { Info, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AskQueryPanel, type AskFiltersActions, type AskFiltersState, type OpenPopoverId, type RetrievalEndpoint } from "@/components/ask/query-panel";
import { AskResultsPanel, type AskLoadState, type AskResultView } from "@/components/ask/results-panel";
import { AskSelectionRail } from "@/components/ask/selection-rail";
import { Popover } from "@/components/ask/popover";
import { useMySelection } from "@/components/selection";
import { ASK_DEFAULT_QUERY, ASK_EXAMPLE_QUERIES, buildSelectionItem, filterByFreshness, type AskResultTabId } from "@/features/ask/lib";
import { ApiError, boxbrainApi, type AskRequest, type FreshnessState, type SearchProfile, type SearchRequest, type SearchResponse, type SearchResultMode } from "@/lib/api";

const INITIAL_LIMIT = 60;
const LOAD_MORE_STEP = 40;

export default function AskPage() {
  const [query, setQuery] = useState(ASK_DEFAULT_QUERY);
  const [endpoint, setEndpoint] = useState<RetrievalEndpoint>("ask");
  const [objectTypes, setObjectTypes] = useState<string[]>([]);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [freshness, setFreshness] = useState<FreshnessState | "any">("any");
  const [profile, setProfile] = useState<SearchProfile>("general");
  const [resultMode, setResultMode] = useState<SearchResultMode>("auto");
  const [showDebug, setShowDebug] = useState(false);
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loadState, setLoadState] = useState<AskLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeTab, setActiveTab] = useState<AskResultTabId>("all");
  const [view, setView] = useState<AskResultView>("grid");
  const [openPopover, setOpenPopover] = useState<OpenPopoverId>(null);

  const selection = useMySelection();

  const visibleItems = useMemo(() => filterByFreshness(response?.items ?? [], freshness), [response, freshness]);
  const resultState: AskLoadState = loadState === "ready" && visibleItems.length === 0 ? "empty" : loadState;

  // Auto-run the default query on first mount so the screen never opens on an empty placeholder —
  // it matches the design mock, which always shows a populated result set.
  useEffect(() => {
    void runSearch(ASK_DEFAULT_QUERY, INITIAL_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildRequest(trimmedQuery: string, requestLimit: number): SearchRequest {
    return {
      query: trimmedQuery,
      profile: approvedOnly ? "approved_only" : profile,
      objectTypes,
      resultMode,
      limit: requestLimit,
      filters: {}
    };
  }

  async function runSearch(rawQuery: string, requestLimit: number) {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      setLoadState("empty");
      setResponse(null);
      setErrorMessage(null);
      return;
    }

    const request = buildRequest(trimmedQuery, requestLimit);
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const nextResponse = endpoint === "ask" ? await boxbrainApi.askBoxBrain(request as AskRequest) : await boxbrainApi.searchBoxBrain(request);
      setResponse(nextResponse);
      setLimit(requestLimit);
      setLoadState(nextResponse.items.length ? "ready" : "empty");
    } catch (error) {
      setResponse(null);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setLoadState("restricted");
        return;
      }
      setLoadState("error");
      setErrorMessage(error instanceof Error ? error.message : "The retrieval request failed.");
    }
  }

  function handleSubmit() {
    setActiveTab("all");
    void runSearch(query, INITIAL_LIMIT);
  }

  function handleExampleClick(example: string) {
    setQuery(example);
    setActiveTab("all");
    void runSearch(example, INITIAL_LIMIT);
  }

  async function handleLoadMore() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setLoadingMore(true);
    try {
      const nextLimit = limit + LOAD_MORE_STEP;
      const request = buildRequest(trimmedQuery, nextLimit);
      const nextResponse = endpoint === "ask" ? await boxbrainApi.askBoxBrain(request as AskRequest) : await boxbrainApi.searchBoxBrain(request);
      setResponse(nextResponse);
      setLimit(nextLimit);
    } catch {
      // Best-effort: keep whatever results are already on screen rather than clearing a good state.
    } finally {
      setLoadingMore(false);
    }
  }

  function handleNewChat() {
    setQuery("");
    setResponse(null);
    setLoadState("idle");
    setErrorMessage(null);
    setActiveTab("all");
    setLimit(INITIAL_LIMIT);
  }

  const filters: AskFiltersState = { objectTypes, approvedOnly, freshness, profile, resultMode, showDebug };
  const filterActions: AskFiltersActions = {
    toggleObjectType: (value) => setObjectTypes((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value])),
    setApprovedOnly,
    setFreshness,
    setProfile,
    setResultMode,
    setShowDebug,
    reset: () => {
      setObjectTypes([]);
      setApprovedOnly(false);
      setFreshness("any");
      setProfile("general");
      setResultMode("auto");
    }
  };

  return (
    <div className="route-body" data-testid="ask-page">
      <div className="two-col items-start">
        <div className="min-w-0">
          <div className="page-head-row">
            <div>
              <h1 className="m-0 flex items-center gap-2 text-[28px] font-bold tracking-tight text-slate-950">
                Ask BoxBrain <Sparkles size={20} color="var(--ai)" aria-hidden="true" />
              </h1>
              <div className="muted mt-1">AI-powered search across your content universe.</div>
            </div>
            <Popover
              isOpen={openPopover === "howItWorks"}
              onOpenChange={(open) => setOpenPopover(open ? "howItWorks" : null)}
              align="right"
              panelLabel="How Ask BoxBrain works"
              trigger={({ onClick, isOpen }) => (
                <button type="button" onClick={onClick} aria-expanded={isOpen} className="link flex items-center gap-1" style={{ color: "var(--ai)" }}>
                  <Info size={14} /> How it works
                </button>
              )}
            >
              <div className="grid gap-2 text-slate-600">
                <p className="m-0">
                  <b>Ask</b> sends your question to natural-language retrieval; <b>Search</b> runs the same ranking engine as a keyword lookup. Both call the
                  live BoxBrain API — nothing on this screen is mocked.
                </p>
                <p className="m-0">
                  Filter chips narrow by content type, approval, freshness, profile, and result grain. Explanation chips on each card show the real ranking
                  signals (keyword / semantic / metadata / trust / freshness) the engine used.
                </p>
                <p className="m-0">
                  Add results to <b>My selection</b> on the right — it is shared across BoxBrain and saved to this browser.
                </p>
              </div>
            </Popover>
          </div>

          <div className="mt-4">
            <AskQueryPanel
              query={query}
              onQueryChange={setQuery}
              onSubmit={handleSubmit}
              loading={loadState === "loading"}
              endpoint={endpoint}
              onEndpointChange={setEndpoint}
              filters={filters}
              filterActions={filterActions}
              examples={ASK_EXAMPLE_QUERIES}
              onExampleClick={handleExampleClick}
              openPopover={openPopover}
              onOpenPopoverChange={setOpenPopover}
            />
          </div>

          <div className="mt-6">
            <AskResultsPanel
              loadState={resultState}
              errorMessage={errorMessage}
              visibleItems={visibleItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              view={view}
              onViewChange={setView}
              showDebug={showDebug}
              debugPayload={response?.debug}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
              isItemSelected={selection.has}
              onToggleSelection={(item) => selection.toggle(buildSelectionItem(item))}
            />
          </div>
        </div>

        <AskSelectionRail onStartNewChat={handleNewChat} />
      </div>
    </div>
  );
}
