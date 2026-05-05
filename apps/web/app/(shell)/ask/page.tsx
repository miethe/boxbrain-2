"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, BookmarkPlus, DatabaseZap, Filter, RotateCcw, Search, ShieldAlert, Sparkles } from "lucide-react";
import { SearchResultCard } from "@/components/search-result-card";
import { Button, Card, EmptyState, PageHeader, StatusBadge, Tag } from "@/components/ui";
import {
  ApiError,
  boxbrainApi,
  type AskRequest,
  type FreshnessState,
  type SearchProfile,
  type SearchRequest,
  type SearchResponse,
  type SearchResultMode
} from "@/lib/api";

type RetrievalEndpoint = "ask" | "search";
type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "restricted";

const profiles: Array<{ value: SearchProfile; label: string }> = [
  { value: "general", label: "General" },
  { value: "executive", label: "Executive" },
  { value: "technical", label: "Technical" },
  { value: "opportunity", label: "Opportunity" },
  { value: "duplicate_review", label: "Duplicate review" },
  { value: "similarity_review", label: "Similarity review" }
];

const objectTypeOptions = [
  { value: "content_unit", label: "ContentUnits" },
  { value: "content_block", label: "ContentBlocks" },
  { value: "work_product", label: "WorkProducts" }
];

const resultModes: Array<{ value: SearchResultMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "families", label: "Families" },
  { value: "variants", label: "Variants" },
  { value: "versions", label: "Versions" }
];

const savedSeedQuery = "approved executive cloud modernization ROI slide";

type SavedSearch = {
  id: string;
  label: string;
  endpoint: RetrievalEndpoint;
  request: SearchRequest;
};

export default function AskPage() {
  const [query, setQuery] = useState(savedSeedQuery);
  const [endpoint, setEndpoint] = useState<RetrievalEndpoint>("ask");
  const [profile, setProfile] = useState<SearchProfile>("executive");
  const [objectTypes, setObjectTypes] = useState<string[]>(["content_unit", "work_product"]);
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [freshness, setFreshness] = useState<FreshnessState | "any">("fresh");
  const [resultMode, setResultMode] = useState<SearchResultMode>("auto");
  const [showDebug, setShowDebug] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const visibleItems = useMemo(() => {
    const items = response?.items ?? [];
    return items.filter((item) => {
      if (approvedOnly && item.statusChips?.approvalState !== "approved") return false;
      if (freshness !== "any" && item.statusChips?.freshnessState !== freshness) return false;
      return true;
    });
  }, [approvedOnly, freshness, response?.items]);
  const resultState: LoadState = loadState === "ready" && visibleItems.length === 0 ? "empty" : loadState;

  async function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setLoadState("empty");
      setResponse(null);
      setErrorMessage(null);
      return;
    }

    const request = buildRequest(trimmedQuery);
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const nextResponse = endpoint === "ask" ? await boxbrainApi.askBoxBrain(request as AskRequest) : await boxbrainApi.searchBoxBrain(request);
      setResponse(nextResponse);
      const nextItems = nextResponse.items.filter((item) => {
        if (approvedOnly && item.statusChips?.approvalState !== "approved") return false;
        if (freshness !== "any" && item.statusChips?.freshnessState !== freshness) return false;
        return true;
      });
      setLoadState(nextItems.length ? "ready" : "empty");
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

  function buildRequest(trimmedQuery = query.trim()): SearchRequest {
    return {
      query: trimmedQuery,
      profile: approvedOnly ? "approved_only" : profile,
      objectTypes,
      resultMode,
      limit: 20,
      filters: {
        approvalState: approvedOnly ? "approved" : undefined,
        freshnessState: freshness === "any" ? undefined : freshness
      }
    };
  }

  function toggleObjectType(value: string) {
    setObjectTypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function saveCurrentSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    const request = buildRequest(trimmedQuery);
    const savedSearch: SavedSearch = {
      id: `${Date.now()}-${savedSearches.length}`,
      label: trimmedQuery,
      endpoint,
      request
    };
    setSavedSearches((current) => [savedSearch, ...current].slice(0, 6));
  }

  function loadSavedSearch(savedSearch: SavedSearch) {
    setQuery(savedSearch.request.query);
    setEndpoint(savedSearch.endpoint);
    setProfile(savedSearch.request.profile === "approved_only" ? "general" : savedSearch.request.profile ?? "general");
    setApprovedOnly(savedSearch.request.profile === "approved_only" || savedSearch.request.filters?.approvalState === "approved");
    setObjectTypes(savedSearch.request.objectTypes ?? []);
    setResultMode(savedSearch.request.resultMode ?? "auto");
    const savedFreshness = savedSearch.request.filters?.freshnessState;
    setFreshness(savedFreshness === "fresh" || savedFreshness === "aging" || savedFreshness === "stale" ? savedFreshness : "any");
  }

  function resetFilters() {
    setEndpoint("ask");
    setProfile("executive");
    setObjectTypes(["content_unit", "work_product"]);
    setApprovedOnly(true);
    setFreshness("fresh");
    setResultMode("auto");
    setShowDebug(false);
  }

  return (
    <div className="route-body" data-testid="ask-page">
      <PageHeader
        eyebrow="Ask BoxBrain"
        title="Ask and search governed content"
        description="API-backed retrieval with profile, object, freshness, and result-grain controls."
      />

      <form onSubmit={submitSearch} className="mb-5">
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3">
              <Sparkles size={18} color="var(--ai)" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Ask BoxBrain query"
                data-testid="ask-query-input"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={loadState === "loading"} data-testid="ask-search-submit">
                <Search size={15} /> {loadState === "loading" ? "Searching" : "Search"}
              </Button>
              <Button type="button" onClick={saveCurrentSearch}>
                <BookmarkPlus size={14} /> Save
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ask", "search"] as RetrievalEndpoint[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEndpoint(value)}
                className={`tag cursor-pointer ${endpoint === value ? "ai" : ""}`}
                aria-pressed={endpoint === value}
              >
                {value === "ask" ? "Ask" : "Search"}
              </button>
            ))}
            {response?.interpretedIntent && <StatusBadge tone="ai">{response.interpretedIntent}</StatusBadge>}
          </div>
        </Card>
      </form>

      <div className="three-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Filter size={15} /> Filters
          </div>
          <div className="grid gap-3">
            <Field label="Profile">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={profile} onChange={(event) => setProfile(event.target.value as SearchProfile)} disabled={approvedOnly}>
                {profiles.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Object type">
              <div className="grid gap-2">
                {objectTypeOptions.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={objectTypes.includes(item.value)} onChange={() => toggleObjectType(item.value)} /> {item.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Governance">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={approvedOnly} onChange={(event) => setApprovedOnly(event.target.checked)} /> Approved only
              </label>
            </Field>
            <Field label="Freshness">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={freshness} onChange={(event) => setFreshness(event.target.value as FreshnessState | "any")}>
                <option value="any">Any</option>
                <option value="fresh">Fresh</option>
                <option value="aging">Aging</option>
                <option value="stale">Stale</option>
              </select>
            </Field>
            <Field label="Result mode">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={resultMode} onChange={(event) => setResultMode(event.target.value as SearchResultMode)}>
                {resultModes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <input type="checkbox" checked={showDebug} onChange={(event) => setShowDebug(event.target.checked)} /> Show debug
            </label>
            <Button type="button" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        </Card>

        <div className="grid content-start gap-3">
          <ResultState state={resultState} errorMessage={errorMessage} />
          {resultState === "ready" && visibleItems.map((item) => <SearchResultCard key={`${item.objectType}-${item.objectId}`} item={item} showDebug={showDebug} />)}
        </div>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <BookmarkPlus size={15} /> Saved searches
            </div>
            <div className="grid gap-2">
              {savedSearches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">No saved searches in this workspace tab.</div>
              ) : (
                savedSearches.map((savedSearch) => (
                  <button key={savedSearch.id} type="button" className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-slate-50" onClick={() => loadSavedSearch(savedSearch)}>
                    <div className="font-bold text-slate-900">{savedSearch.label}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Tag>{savedSearch.endpoint}</Tag>
                      <Tag>{savedSearch.request.profile ?? "general"}</Tag>
                      <Tag>{savedSearch.request.resultMode ?? "auto"}</Tag>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {showDebug && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <DatabaseZap size={15} /> Debug
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(response?.debug ?? { visibleItems: visibleItems.length }, null, 2)}</pre>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function ResultState({ state, errorMessage }: { state: LoadState; errorMessage: string | null }) {
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
