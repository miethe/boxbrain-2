"use client";

import { useState } from "react";
import { BarChart3, Move, Sparkles, SlidersHorizontal } from "lucide-react";
import type { ApprovalState } from "@/lib/api";

export type CanvasFilters = {
  onlyGaps: boolean;
  approval: Set<ApprovalState>;
};

export const ALL_APPROVAL_STATES: ApprovalState[] = ["draft", "review", "approved", "deprecated", "archived"];

export function CanvasToolbar({
  sectionCount,
  reorderMode,
  onToggleReorder,
  showMetrics,
  onToggleMetrics,
  trackChanges,
  onToggleTrackChanges,
  filters,
  onFiltersChange
}: {
  sectionCount: number;
  reorderMode: boolean;
  onToggleReorder: () => void;
  showMetrics: boolean;
  onToggleMetrics: () => void;
  trackChanges: boolean;
  onToggleTrackChanges: () => void;
  filters: CanvasFilters;
  onFiltersChange: (filters: CanvasFilters) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = (filters.onlyGaps ? 1 : 0) + filters.approval.size;

  return (
    <div className="card mb-2.5 flex flex-wrap items-center gap-2 p-2" data-testid="storyboard-toolbar">
      <b className="text-[13px]">Storyboard</b>
      <span className="muted text-[11px]">{sectionCount} sections</span>
      <span className="flex-1" />
      <button type="button" onClick={onToggleReorder} className={`btn btn-xs ${reorderMode ? "btn-primary" : ""}`} aria-pressed={reorderMode}>
        <Move size={11} aria-hidden="true" /> Reorder
      </button>
      <button type="button" onClick={onToggleMetrics} className={`btn btn-xs ${showMetrics ? "btn-primary" : ""}`} aria-pressed={showMetrics}>
        <BarChart3 size={11} aria-hidden="true" /> Metrics
      </button>
      <div className="relative">
        <button type="button" onClick={() => setFiltersOpen((value) => !value)} className={`btn btn-xs ${activeFilterCount > 0 ? "btn-primary" : ""}`} aria-expanded={filtersOpen}>
          <SlidersHorizontal size={11} aria-hidden="true" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        {filtersOpen && (
          <div className="tweaks-panel" style={{ position: "absolute", top: 30, right: 0, width: 220 }}>
            <h4>Filter canvas</h4>
            <div className="tweak-row">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={filters.onlyGaps} onChange={(event) => onFiltersChange({ ...filters, onlyGaps: event.target.checked })} />
                Show only gaps
              </label>
            </div>
            <div className="tweak-row">
              <div className="label">Approval state</div>
              <div className="grid gap-1">
                {ALL_APPROVAL_STATES.map((state) => (
                  <label key={state} className="flex items-center gap-2 text-xs capitalize">
                    <input
                      type="checkbox"
                      checked={filters.approval.has(state)}
                      onChange={(event) => {
                        const next = new Set(filters.approval);
                        if (event.target.checked) next.add(state);
                        else next.delete(state);
                        onFiltersChange({ ...filters, approval: next });
                      }}
                    />
                    {state}
                  </label>
                ))}
              </div>
            </div>
            <button type="button" className="link text-xs" onClick={() => onFiltersChange({ onlyGaps: false, approval: new Set() })}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-xs"
        style={{ background: "var(--ai)", color: "#fff", borderColor: "var(--ai)", opacity: 0.6, cursor: "not-allowed" }}
        disabled
        title="AI Rebalance requires a section-recommendation endpoint that does not exist yet (audit-digest.md ## storyboard API[no])."
      >
        <Sparkles size={11} aria-hidden="true" /> AI Rebalance
      </button>
      <div className="mx-1 h-4.5 w-px bg-[var(--line)]" />
      <label className="flex items-center gap-1.5 text-[11px] text-[var(--ink-3)]" title="Highlights AI-recommended slots and slots with open diagnostics warnings (a real, not fabricated, diff proxy -- true version-to-version comparison requires the snapshot-diff endpoint tracked in audit-digest.md).">
        <input type="checkbox" checked={trackChanges} onChange={onToggleTrackChanges} /> Track changes
      </label>
    </div>
  );
}
