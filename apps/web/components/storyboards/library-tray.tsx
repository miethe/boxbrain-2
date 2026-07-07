"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Library, Plus, Search, Sparkles, X } from "lucide-react";
import { boxbrainApi, type ContentBlockVersionDetail, type StatusChips } from "@/lib/api";
import { useMySelection } from "@/components/selection";
import { ObjectTypeIcon } from "./object-icon";
import type { PendingTarget, TrayItem, TrayObjectType } from "./types";

type LibraryTab = "recommended" | "recent" | "library";
type TypeFilter = "all" | "content_unit_version" | "content_block_version" | "work_product_version";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOM_ITEM_DISABLED_TITLE = "Custom items can't be placed in storyboards yet";

export function LibraryTray({
  open,
  onToggleOpen,
  sectionOptions,
  activeSectionId,
  contentBlocks,
  pendingTarget,
  onCancelPending,
  onPick
}: {
  open: boolean;
  onToggleOpen: () => void;
  sectionOptions: Array<{ id: string; title: string }>;
  activeSectionId: string | null;
  contentBlocks: ContentBlockVersionDetail[];
  pendingTarget: PendingTarget;
  onCancelPending: () => void;
  onPick: (item: TrayItem) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>("recommended");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [manualContextId, setManualContextId] = useState<string>("");
  const [recommended, setRecommended] = useState<TrayItem[] | null>(null);
  const [recent, setRecent] = useState<TrayItem[] | null>(null);
  const [searchResults, setSearchResults] = useState<TrayItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const selection = useMySelection();

  const contextSectionId = manualContextId || activeSectionId || sectionOptions[0]?.id || "";
  const contextSection = sectionOptions.find((section) => section.id === contextSectionId);
  const contextLabel = contextSection?.title ?? "this storyboard";

  useEffect(() => {
    if (!open || tab !== "recommended") return;
    let cancelled = false;
    setLoading(true);
    boxbrainApi
      .searchBoxBrain({ query: contextLabel, resultMode: "versions", limit: 10 })
      .then((response) => {
        if (cancelled) return;
        setRecommended(toTrayItems(response.items));
      })
      .catch(() => !cancelled && setRecommended([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, tab, contextLabel]);

  useEffect(() => {
    if (!open || tab !== "recent") return;
    let cancelled = false;
    setLoading(true);
    boxbrainApi
      .searchBoxBrain({ query: "", resultMode: "versions", limit: 20 })
      .then(async (response) => {
        const candidates = toTrayItems(response.items).filter((item) => item.selectedObjectType === "content_unit_version").slice(0, 10);
        const withDates = await Promise.all(
          candidates.map(async (item) => {
            try {
              const version = await boxbrainApi.getContentUnitVersion(item.selectedObjectId);
              return { ...item, createdAt: version.createdAt };
            } catch {
              return item;
            }
          })
        );
        if (cancelled) return;
        setRecent(withDates.sort((left, right) => dateValue(right.createdAt) - dateValue(left.createdAt)));
      })
      .catch(() => !cancelled && setRecent([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  useEffect(() => {
    if (!open || !search.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      boxbrainApi
        .searchBoxBrain({ query: search.trim(), resultMode: "versions", limit: 16 })
        .then((response) => !cancelled && setSearchResults(toTrayItems(response.items)))
        .catch(() => !cancelled && setSearchResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  const libraryItems: TrayItem[] = useMemo(
    () =>
      contentBlocks.map((block) => ({
        key: `content_block_version:${block.id}`,
        selectedObjectType: "content_block_version" as const,
        selectedObjectId: block.id,
        title: block.title,
        summary: block.summary,
        statusChips: { approvalState: block.approvalState, freshnessState: "fresh", isCanonical: true, isRestricted: false }
      })),
    [contentBlocks]
  );

  const selectionItems: TrayItem[] = useMemo(() => usableSelectionItems(selection.items), [selection.items]);

  const activeList = search.trim() ? searchResults : tab === "recommended" ? recommended : tab === "recent" ? recent : libraryItems;
  const filtered = (activeList ?? []).filter((item) => {
    if (typeFilter !== "all" && item.selectedObjectType !== typeFilter) return false;
    if (approvedOnly && item.statusChips?.approvalState !== "approved") return false;
    return true;
  });

  if (!open) {
    return (
      <aside className="sticky top-4" data-testid="storyboard-library-tray-collapsed">
        <button
          type="button"
          onClick={onToggleOpen}
          className="card flex w-11 flex-col items-center gap-2 border border-[var(--line)] py-3"
          aria-label="Expand content library"
        >
          <Library size={16} color="var(--primary)" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-[var(--ink-2)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            Library
          </span>
          <ChevronRight size={13} color="var(--ink-3)" aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="card sticky top-4 flex max-h-[calc(100vh-40px)] flex-col overflow-hidden p-0" data-testid="storyboard-library-tray">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Library size={14} color="var(--primary)" aria-hidden="true" />
          <b className="text-[13px]">Content Library</b>
        </div>
        <button type="button" className="icon-btn borderless h-5.5 w-5.5" onClick={onToggleOpen} aria-label="Collapse content library">
          <ChevronRight size={12} className="rotate-180" aria-hidden="true" />
        </button>
      </div>

      {pendingTarget && (
        <div className="flex items-center gap-2 border-b border-[var(--primary-border)] bg-[var(--primary-bg)] px-3 py-2 text-[11px] text-[var(--primary-ink)]">
          <span className="min-w-0 flex-1 truncate">
            {pendingTarget.kind === "add" ? "Choose content to add to " : "Choose content to swap into "}
            <b>{pendingTarget.label}</b>
          </span>
          <button type="button" onClick={onCancelPending} className="icon-btn borderless h-5 w-5 shrink-0" aria-label="Cancel">
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="border-b border-[var(--line-soft)] px-2.5 py-2">
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5">
          <Search size={12} color="var(--ink-3)" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search content units…"
            aria-label="Search content units"
            className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={11} color="var(--ink-3)" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!search.trim() && (
        <div className="grid grid-cols-3 border-b border-[var(--line-soft)] text-[11px]">
          {(
            [
              { id: "recommended" as const, label: "Recommended" },
              { id: "recent" as const, label: "Recent" },
              { id: "library" as const, label: `Library (${contentBlocks.length})` }
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className="border-b-2 px-1 py-1.5 text-center font-medium"
              style={{
                borderColor: tab === option.id ? "var(--primary)" : "transparent",
                color: tab === option.id ? "var(--primary)" : "var(--ink-3)"
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--line-soft)] px-2.5 py-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "content_unit_version" as const, label: "ContentUnits" },
            { id: "content_block_version" as const, label: "Blocks" },
            { id: "work_product_version" as const, label: "WorkProducts" }
          ]
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTypeFilter(option.id)}
            className={`chip ${typeFilter === option.id ? "active" : ""}`}
            style={{ height: 22, fontSize: 10, padding: "2px 7px" }}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setApprovedOnly((value) => !value)}
          className={`chip ${approvedOnly ? "active" : ""}`}
          style={{ height: 22, fontSize: 10, padding: "2px 7px" }}
        >
          Approved only
        </button>
      </div>

      {!search.trim() && tab === "recommended" && (
        <div className="border-b border-[var(--line-soft)] bg-[var(--ai-bg)] px-2.5 py-2">
          <div className="flex items-start gap-2">
            <Sparkles size={12} color="var(--ai)" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-[10.5px] leading-snug text-[var(--ink-2)]">
              Ranked by relevance to <b>{contextLabel}</b>.
              {sectionOptions.length > 1 && (
                <label className="mt-1 flex items-center gap-1">
                  <span className="sr-only">Change recommendation context</span>
                  <select
                    value={contextSectionId}
                    onChange={(event) => setManualContextId(event.target.value)}
                    className="w-full rounded border border-[var(--ai-border)] bg-[var(--paper)] px-1 py-0.5 text-[10px]"
                  >
                    {sectionOptions.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto p-2.5" data-testid="storyboard-library-items">
        {loading && filtered.length === 0 && <div className="col-span-2 py-6 text-center text-[11px] text-[var(--ink-3)]">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="col-span-2 rounded-md border border-dashed border-[var(--line-2)] p-4 text-center text-[11px] text-[var(--ink-3)]">
            {search.trim() ? "No matches for this search." : "Nothing to show for this tab yet."}
          </div>
        )}
        {filtered.map((item) => (
          <TrayChip key={item.key} item={item} draggable onClick={() => onPick(item)} />
        ))}
      </div>

      {selectionItems.length > 0 && (
        <details className="border-t border-[var(--line-soft)] px-2.5 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-[var(--ink-2)]">From My Selection ({selectionItems.length})</summary>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {selectionItems.map((item) => (
              <TrayChip key={item.key} item={item} draggable onClick={() => onPick(item)} compact />
            ))}
          </div>
        </details>
      )}

      <div className="border-t border-[var(--line)] bg-[var(--bg)] px-2.5 py-2">
        <div className="mb-1 text-[10px] text-[var(--ink-3)]">Drag to canvas, or click a chip after choosing a slot</div>
        <div className="flex items-center gap-1">
          <Link href="/ingestion" className="btn btn-xs flex-1 justify-center">
            <Plus size={10} aria-hidden="true" /> New Unit
          </Link>
          <button
            type="button"
            className="btn btn-xs flex-1 justify-center"
            style={{ background: "var(--ai)", color: "#fff", borderColor: "var(--ai)" }}
            disabled
            title="Generating new content units from an AI prompt requires a pipeline that doesn't exist yet (audit-digest.md ## storyboard API[no])."
          >
            <Sparkles size={10} aria-hidden="true" /> AI Generate
          </button>
        </div>
      </div>
    </aside>
  );
}

function TrayChip({ item, draggable, onClick, compact }: { item: TrayItem; draggable?: boolean; onClick: () => void; compact?: boolean }) {
  const disabled = Boolean(item.disabledReason);
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      draggable={draggable && !disabled}
      onDragStart={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("application/x-boxbrain-library-item", JSON.stringify(item));
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => {
        if (!disabled) onClick();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`card border border-[var(--line)] p-1.5 text-left transition ${
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:border-[var(--primary-border)]"
      }`}
      title={item.disabledReason ?? item.summary ?? item.title}
    >
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-[var(--ink-2)]">
        <ObjectTypeIcon type={item.selectedObjectType} size={10} color="var(--primary)" />
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
      </div>
      {!compact && (
        <div className="overflow-hidden rounded" style={{ aspectRatio: "16/10" }}>
          <div className="flex h-full w-full items-center justify-center bg-[var(--bg-2)] text-[9px] text-[var(--ink-4)]">
            <ObjectTypeIcon type={item.selectedObjectType} size={16} color="var(--ink-3)" />
          </div>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <span className="muted">{grainLabel(item.selectedObjectType)}</span>
        {typeof item.score === "number" && <span style={{ color: item.score >= 90 ? "var(--ok)" : "var(--primary)", fontWeight: 600 }}>{item.score}%</span>}
      </div>
    </div>
  );
}

function grainLabel(type: TrayObjectType) {
  if (type === "content_block_version") return "Block";
  if (type === "work_product_version") return "Work Product";
  return "ContentUnit";
}

function toTrayItems(items: Array<{ objectType: string; objectId: string; title: string; summary?: string | null; score: number; statusChips?: StatusChips }>): TrayItem[] {
  return items
    .filter((item) => item.objectType === "content_unit_version" || item.objectType === "content_block_version" || item.objectType === "work_product_version")
    .map((item) => ({
      key: `${item.objectType}:${item.objectId}`,
      selectedObjectType: item.objectType as TrayObjectType,
      selectedObjectId: item.objectId,
      title: item.title,
      summary: item.summary,
      score: Math.round(item.score * 100) > 100 ? Math.round(item.score) : Math.round(item.score * 100),
      statusChips: item.statusChips
    }));
}

function usableSelectionItems(items: Array<{ id: string; type: string; title: string; subtitle?: string }>): TrayItem[] {
  const trayItems: TrayItem[] = [];
  for (const item of items) {
    const selectedObjectType = selectedObjectTypeForSelection(item.type);
    if (!selectedObjectType) continue;
    const isPlaceable = UUID_RE.test(item.id);
    trayItems.push({
      key: `${selectedObjectType}:${item.id}`,
      selectedObjectType,
      selectedObjectId: item.id,
      title: item.title,
      summary: item.subtitle,
      disabledReason: isPlaceable ? undefined : CUSTOM_ITEM_DISABLED_TITLE
    });
  }
  return trayItems;
}

function selectedObjectTypeForSelection(type: string): TrayObjectType | null {
  if (type === "workproduct") return "work_product_version";
  if (type === "asset") return "content_block_version";
  if (type === "contentunit") return "content_unit_version";
  return null;
}

function dateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
