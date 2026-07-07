"use client";

import { Check, ChevronDown, Info, Mic, Plus, Send, X } from "lucide-react";
import { type KeyboardEvent } from "react";
import { Chip } from "@/components/ui";
import type { FreshnessState, SearchProfile, SearchResultMode } from "@/lib/api";
import { objectTypesChipLabel } from "@/features/ask/lib";
import { Popover } from "./popover";

export type RetrievalEndpoint = "ask" | "search";

export const OBJECT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "content_unit", label: "ContentUnits (Slides)" },
  { value: "content_block", label: "ContentBlocks" },
  { value: "work_product", label: "Work Products" }
];

export const PROFILE_OPTIONS: Array<{ value: SearchProfile; label: string }> = [
  { value: "general", label: "General" },
  { value: "executive", label: "Executive" },
  { value: "technical", label: "Technical" },
  { value: "opportunity", label: "Opportunity" },
  { value: "duplicate_review", label: "Duplicate review" },
  { value: "similarity_review", label: "Similarity review" }
];

export const RESULT_MODE_OPTIONS: Array<{ value: SearchResultMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "families", label: "Families" },
  { value: "variants", label: "Variants" },
  { value: "versions", label: "Versions" }
];

export type AskFiltersState = {
  objectTypes: string[];
  approvedOnly: boolean;
  freshness: FreshnessState | "any";
  profile: SearchProfile;
  resultMode: SearchResultMode;
  showDebug: boolean;
};

export type AskFiltersActions = {
  toggleObjectType: (value: string) => void;
  setApprovedOnly: (value: boolean) => void;
  setFreshness: (value: FreshnessState | "any") => void;
  setProfile: (value: SearchProfile) => void;
  setResultMode: (value: SearchResultMode) => void;
  setShowDebug: (value: boolean) => void;
  reset: () => void;
};

export type OpenPopoverId = "objectTypes" | "freshness" | "advanced" | "howItWorks" | null;

export function AskQueryPanel({
  query,
  onQueryChange,
  onSubmit,
  loading,
  endpoint,
  onEndpointChange,
  filters,
  filterActions,
  examples,
  onExampleClick,
  openPopover,
  onOpenPopoverChange
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  endpoint: RetrievalEndpoint;
  onEndpointChange: (value: RetrievalEndpoint) => void;
  filters: AskFiltersState;
  filterActions: AskFiltersActions;
  examples: string[];
  onExampleClick: (value: string) => void;
  openPopover: OpenPopoverId;
  onOpenPopoverChange: (id: OpenPopoverId) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="ai-panel" data-testid="ask-ai-panel">
      <div className="mb-2 flex items-center justify-end gap-1.5" role="group" aria-label="Retrieval mode">
        <span className="muted text-[11px]">Mode:</span>
        <Chip active={endpoint === "ask"} onClick={() => onEndpointChange("ask")} data-testid="ask-mode-ask">
          Ask
        </Chip>
        <Chip active={endpoint === "search"} onClick={() => onEndpointChange("search")} data-testid="ask-mode-search">
          Search
        </Chip>
      </div>

      <div className="relative">
        <textarea
          className="input"
          rows={2}
          style={{ fontSize: 16, border: "none", background: "transparent", padding: "8px 76px 8px 0", resize: "none" }}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ask BoxBrain query"
          placeholder={endpoint === "ask" ? "Ask BoxBrain anything…" : "Search governed content by keyword…"}
          data-testid="ask-query-input"
        />
        <button
          type="button"
          className="icon-btn borderless"
          style={{ position: "absolute", right: 52, top: 8 }}
          disabled
          aria-disabled="true"
          title="Voice input is not available yet"
          aria-label="Voice input (coming soon)"
        >
          <Mic size={16} />
        </button>
        <button
          type="button"
          className="ai-btn"
          style={{ position: "absolute", right: 4, top: 4, width: 40, height: 36, marginTop: 0, padding: 0, justifyContent: "center" }}
          onClick={onSubmit}
          disabled={loading}
          aria-label={endpoint === "ask" ? "Ask BoxBrain" : "Search BoxBrain"}
          data-testid="ask-search-submit"
        >
          <Send size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Popover
          isOpen={openPopover === "objectTypes"}
          onOpenChange={(open) => onOpenPopoverChange(open ? "objectTypes" : null)}
          panelLabel="Content type filter"
          trigger={({ onClick, isOpen }) => (
            <button
              type="button"
              className={chipClass(filters.objectTypes.length > 0 && filters.objectTypes.length < OBJECT_TYPE_OPTIONS.length)}
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={onClick}
              data-testid="ask-filter-object-types"
            >
              {objectTypesChipLabel(filters.objectTypes, OBJECT_TYPE_OPTIONS.length)}
              <ChevronDown size={10} />
            </button>
          )}
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Content type</div>
          <div className="grid gap-2">
            {OBJECT_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.objectTypes.includes(option.value)}
                  onChange={() => filterActions.toggleObjectType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">No type selected searches every governed object type, including Plays once indexed.</p>
        </Popover>

        <button
          type="button"
          className={chipClass(filters.approvedOnly)}
          onClick={() => filterActions.setApprovedOnly(!filters.approvedOnly)}
          aria-pressed={filters.approvedOnly}
          data-testid="ask-filter-approved-only"
        >
          {filters.approvedOnly && <Check size={12} />}
          Approved only
          {filters.approvedOnly && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear approved-only filter"
              className="opacity-70 hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                filterActions.setApprovedOnly(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  filterActions.setApprovedOnly(false);
                }
              }}
            >
              <X size={10} />
            </span>
          )}
        </button>

        <Popover
          isOpen={openPopover === "freshness"}
          onOpenChange={(open) => onOpenPopoverChange(open ? "freshness" : null)}
          panelLabel="Freshness filter"
          trigger={({ onClick, isOpen }) => (
            <button
              type="button"
              className={chipClass(filters.freshness !== "any")}
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={onClick}
              data-testid="ask-filter-freshness"
            >
              Freshness{filters.freshness !== "any" ? `: ${filters.freshness}` : ""}
              <ChevronDown size={10} />
            </button>
          )}
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Freshness</div>
          <div className="grid gap-1">
            {(["any", "fresh", "aging", "stale"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                <input type="radio" name="ask-freshness" checked={filters.freshness === value} onChange={() => filterActions.setFreshness(value)} />
                {value}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Narrows the current result page client-side; the API does not hard-filter freshness server-side.</p>
        </Popover>

        <Popover
          isOpen={openPopover === "advanced"}
          onOpenChange={(open) => onOpenPopoverChange(open ? "advanced" : null)}
          panelLabel="More filters"
          panelClassName="w-80"
          trigger={({ onClick, isOpen }) => (
            <button type="button" className={chipClass(false)} aria-expanded={isOpen} aria-haspopup="true" onClick={onClick} data-testid="ask-filter-advanced">
              <Plus size={12} /> More filters
            </button>
          )}
        >
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Profile
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal normal-case text-slate-800"
                value={filters.profile}
                onChange={(event) => filterActions.setProfile(event.target.value as SearchProfile)}
                disabled={filters.approvedOnly}
              >
                {PROFILE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {filters.approvedOnly && <span className="text-[11px] font-normal normal-case text-slate-400">Ignored while &quot;Approved only&quot; is on.</span>}
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Result grain
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal normal-case text-slate-800"
                value={filters.resultMode}
                onChange={(event) => filterActions.setResultMode(event.target.value as SearchResultMode)}
              >
                {RESULT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 border-t border-slate-100 pt-2 text-sm text-slate-600">
              <input type="checkbox" checked={filters.showDebug} onChange={(event) => filterActions.setShowDebug(event.target.checked)} />
              Show debug output
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm justify-self-start"
              onClick={() => {
                filterActions.reset();
                onOpenPopoverChange(null);
              }}
            >
              Reset filters
            </button>
          </div>
        </Popover>
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
        <Info size={12} /> Try an example
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        {examples.map((example) => (
          <Chip key={example} onClick={() => onExampleClick(example)} data-testid="ask-example-chip">
            {example}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function chipClass(active: boolean) {
  return `chip${active ? " active" : ""}`;
}
