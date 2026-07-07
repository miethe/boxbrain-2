"use client";

import clsx from "clsx";
import { Eye, MoreHorizontal, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { assetUrl, formatDate, toPercent } from "@/features/reviews/format";
import type { EnrichedTarget } from "@/features/reviews/types";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Full multi-item compare overlay (uploads/slide-compare.png). The mockup's ratings, usage
 * plays/views, file size, and last-updated-by fields have no backend support (audit-digest.md ##
 * reviews, API[partial]) so this drawer shows the two fields that ARE real (Quality Score /
 * Reuse Score from ContentUnitVersion.qualityScore/usageScore) and an explicit note for the rest,
 * rather than inventing numbers that look real.
 */
export function CompareDrawer({ open, onClose, targets }: { open: boolean; onClose: () => void; targets: EnrichedTarget[] }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[58] bg-slate-900/25" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-compare-drawer-heading"
        data-testid="reviews-compare-drawer"
        className={clsx(
          "fixed inset-y-0 right-0 z-[60] flex w-[560px] max-w-[94vw] flex-col border-l border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow-lg)] transition-transform duration-200 ease-out",
          entered ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <b id="reviews-compare-drawer-heading" className="text-sm font-bold text-[var(--ink)]">
              Compare
            </b>
            <span className="rounded-full bg-[var(--primary-bg)] px-[7px] py-px text-[11px] font-bold text-[var(--primary-ink)]">
              {targets.length} item{targets.length === 1 ? "" : "s"} selected
            </span>
          </div>
          <button type="button" className="icon-btn borderless h-[26px] w-[26px]" title="Close" aria-label="Close compare" onClick={onClose}>
            <X size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid gap-3">
            {targets.map((target) => (
              <CompareDrawerCard key={target.versionId ?? target.index} target={target} />
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-[var(--line-2)] p-3 text-center text-xs text-[var(--ink-3)]" title="Session-scoped multi-item selection has no backend concept yet (audit-digest.md ## reviews).">
            Add another item — search or browse content to compare
            <div className="mt-1 font-medium text-[var(--ink-4)]">Not available yet: no session/selection API exists for staging a third item here.</div>
          </div>
        </div>

        <div className="border-t border-[var(--line)] bg-[var(--bg-2)] px-4 py-2.5 text-[11px] text-[var(--ink-3)]">
          Ratings, file size, and last-updated-by attribution are not tracked by the API yet; only Quality Score and Reuse Score reflect real data.
        </div>
      </div>
    </>
  );
}

function CompareDrawerCard({ target }: { target: EnrichedTarget }) {
  const quality = toPercent(target.qualityScore);
  const reuse = toPercent(target.usageScore);
  const previewUrl = assetUrl(target.renderUri ?? target.thumbnailUri);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--ink-2)]">
        <input type="checkbox" defaultChecked disabled aria-label={`${target.index === 0 ? "Current" : `Alternative ${target.index}`} item (always included)`} />
        {target.index === 0 ? "Current" : `Alternative ${target.index}`}
      </div>
      <div className="p-3">
        <div className="mb-1 text-[13px] font-bold text-[var(--ink)]">{target.title}</div>
        <div className="mb-2 text-[11px] text-[var(--ink-3)]">
          {target.versionNumber ?? "version n/a"} · {formatDate(target.createdAt)}
        </div>
        {target.isRestricted ? (
          <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500">
            <ShieldAlert size={18} />
          </div>
        ) : previewUrl ? (
          <div className="aspect-video rounded-lg border border-[var(--line)] bg-cover bg-center" style={{ backgroundImage: `url("${previewUrl}")` }} role="img" aria-label={`${target.title} preview`} />
        ) : (
          <SlideThumb title={target.title} variant={target.index % 2 === 0 ? "dark" : "light"} brand="BB" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] px-3 py-2">
        {target.approvalState && <StatusBadge tone={target.approvalState === "approved" ? "ok" : target.approvalState === "deprecated" || target.approvalState === "archived" ? "danger" : "warn"}>{target.approvalState}</StatusBadge>}
        {target.freshnessState && <Tag tone={target.freshnessState === "fresh" ? "ok" : target.freshnessState === "stale" ? "danger" : "warn"}>{target.freshnessState}</Tag>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line-soft)] px-3 py-2 text-[11px] text-[var(--ink-3)]">
        {quality !== null ? <ScorePill value={quality} label="quality" /> : <span>Quality score not loaded</span>}
        {reuse !== null ? <ScorePill value={reuse} label="reuse" /> : <span>Reuse score not loaded</span>}
      </div>
      <div className="flex items-center gap-1 border-t border-[var(--line-soft)] px-3 py-1.5">
        <a
          className={clsx("icon-btn borderless", !previewUrl && "pointer-events-none opacity-40")}
          href={previewUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open full preview of ${target.title}`}
          title={previewUrl ? "Open full preview" : "No preview available"}
        >
          <Eye size={13} />
        </a>
        <button type="button" className="icon-btn borderless" disabled aria-label="More actions (not available yet)" title="More actions are not available yet">
          <MoreHorizontal size={13} />
        </button>
      </div>
    </div>
  );
}
