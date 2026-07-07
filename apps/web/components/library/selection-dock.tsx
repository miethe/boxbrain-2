"use client";

import { AlertCircle, GitCompareArrows, Layers, Loader2, X } from "lucide-react";
import type { SelectionItem } from "@/components/selection";
import { Button, IconButton, SlideThumb } from "@/components/ui";

/**
 * Slim bottom bar shown on the Content Units tab once at least one ContentUnit variant has been
 * added to the shared, cross-app "My Selection" store. The itemized list lives in the shared
 * MySelectionDrawer (opened via `onOpenSelection`) so this bar avoids duplicating that UI.
 */
export function ContentUnitSelectionBar({
  count,
  onOpenSelection,
  onClear,
  onCompare,
  onAddToStoryboard,
  busy,
  errorMessage
}: {
  count: number;
  onOpenSelection: () => void;
  onClear: () => void;
  onCompare: () => void;
  onAddToStoryboard: () => void;
  busy: boolean;
  errorMessage: string | null;
}) {
  if (count === 0) return null;
  return (
    <div
      className="fixed inset-x-6 bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2.5 shadow-[var(--shadow-lg)] lg:inset-x-[280px] lg:right-[360px]"
      data-testid="library-selection-dock"
      role="region"
      aria-label="Content unit selection"
    >
      <b className="px-1 text-xs">{count} content unit{count === 1 ? "" : "s"} in My Selection</b>
      <button type="button" className="link" onClick={onOpenSelection}>
        Open selection
      </button>
      <span className="flex-1" />
      {errorMessage && (
        <span className="flex items-center gap-1 text-xs text-[var(--danger)]">
          <AlertCircle size={13} /> {errorMessage}
        </span>
      )}
      <Button size="sm" onClick={onCompare} disabled={count < 2} title={count < 2 ? "Select at least 2 content units to compare" : undefined}>
        <GitCompareArrows size={13} /> Compare ({count})
      </Button>
      <Button variant="primary" size="sm" onClick={onAddToStoryboard} disabled={busy}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />} Add to Storyboard
      </Button>
      <IconButton label="Clear content unit selection" borderless onClick={onClear}>
        <X size={14} />
      </IconButton>
    </div>
  );
}

export function CompareDrawer({ entries, onClose, onRemove }: { entries: SelectionItem[]; onClose: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Compare selected content units">
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-lg)]">
        <div className="mb-4 flex items-center justify-between">
          <b className="text-sm">Compare — {entries.length} items selected</b>
          <IconButton label="Close compare view" borderless onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(entries.length, 4) || 1}, minmax(0, 1fr))` }}>
          {entries.map((entry) => (
            <div key={entry.id} className="compare-card">
              <button type="button" className="remove" aria-label={`Remove ${entry.title}`} onClick={() => onRemove(entry.id)}>
                <X size={11} />
              </button>
              {entry.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.thumb} alt="" className="h-24 w-full rounded object-cover" />
              ) : (
                <SlideThumb title={entry.title} variant="light" chart={false} />
              )}
              <div className="text-sm font-semibold">{entry.title}</div>
              {entry.subtitle && <div className="text-xs text-[var(--ink-3)]">{entry.subtitle}</div>}
            </div>
          ))}
        </div>
        {entries.length === 0 && <p className="m-0 text-sm text-[var(--ink-3)]">No items selected.</p>}
      </div>
    </div>
  );
}
