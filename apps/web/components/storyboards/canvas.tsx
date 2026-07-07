"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Plus, Replace, Sparkles } from "lucide-react";
import { Badge, IconButton, Tag } from "@/components/ui";
import type { StoryboardDiagnosticWarning, StoryboardSection, StoryboardSlot } from "@/lib/api";
import { ObjectTypeIcon, DragHandleIcon } from "./object-icon";
import type { PendingTarget, StoryboardActions, TrayItem } from "./types";
import type { CanvasFilters } from "./toolbar";
import { approvalTone, freshnessTone, slotDetailFor, slotTitle, warningsForSection, warningsForSlot, type SlotObjectDetail } from "@/features/storyboards/lib";

type SelectedSlot = { sectionId: string; slotId: string } | null;

export function InsertSectionDivider({ onCreate }: { onCreate: (title: string, summary: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  if (open) {
    return (
      <div className="my-2 rounded-lg border border-dashed border-[var(--primary-border)] bg-[var(--primary-bg)] p-2.5">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Section title"
            className="rounded-md border border-[var(--line)] px-2 py-1.5 text-xs"
          />
          <input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Summary (optional)"
            className="rounded-md border border-[var(--line)] px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={!title.trim() || busy}
            onClick={async () => {
              setBusy(true);
              await onCreate(title.trim(), summary.trim());
              setBusy(false);
              setTitle("");
              setSummary("");
              setOpen(false);
            }}
            className="btn btn-primary btn-xs"
          >
            Insert
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-xs">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(event: KeyboardEvent) => (event.key === "Enter" ? setOpen(true) : undefined)}
      className="my-0.5 flex cursor-pointer items-center gap-2 px-0.5"
      style={{ height: expanded ? 26 : 10 }}
      aria-label="Insert section here"
    >
      <div className="flex-1 rounded" style={{ height: expanded ? 2 : 1, background: expanded ? "var(--primary)" : "var(--line-soft)", transition: "all .15s" }} />
      <span
        className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold"
        style={{ color: expanded ? "var(--primary)" : "transparent", transition: "color .15s" }}
      >
        <Plus size={11} aria-hidden="true" /> Insert Section
      </span>
      <div className="flex-1 rounded" style={{ height: expanded ? 2 : 1, background: expanded ? "var(--primary)" : "var(--line-soft)", transition: "all .15s" }} />
    </div>
  );
}

export function SectionCard({
  section,
  index,
  total,
  storyboardId,
  objectDetails,
  warnings,
  selectedSlot,
  onSelectSlot,
  onRequestAdd,
  onRequestSwap,
  reorderMode,
  trackChanges,
  filters,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  actions
}: {
  section: StoryboardSection;
  index: number;
  total: number;
  storyboardId: string;
  objectDetails: Record<string, SlotObjectDetail>;
  warnings: StoryboardDiagnosticWarning[];
  selectedSlot: SelectedSlot;
  onSelectSlot: (sectionId: string, slotId: string) => void;
  onRequestAdd: (target: PendingTarget) => void;
  onRequestSwap: (target: PendingTarget) => void;
  reorderMode: boolean;
  trackChanges: boolean;
  filters: CanvasFilters;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  actions: StoryboardActions;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [summary, setSummary] = useState(section.summary ?? "");
  const [saving, setSaving] = useState(false);
  const sectionWarnings = warningsForSection(warnings, section);

  async function saveRename() {
    if (!title.trim()) return;
    setSaving(true);
    await actions.renameSection({ storyboardId, sectionId: section.id, title: title.trim(), summary: summary.trim() || null, orderIndex: section.orderIndex });
    setSaving(false);
    setEditing(false);
  }

  function handleTrayDrop(event: DragEvent<HTMLDivElement>, targetSlotId?: string) {
    event.preventDefault();
    const libraryPayload = event.dataTransfer.getData("application/x-boxbrain-library-item");
    if (libraryPayload) {
      const item = JSON.parse(libraryPayload) as TrayItem;
      if (targetSlotId) {
        void actions.swapSlotContent({ storyboardId, slotId: targetSlotId, selectedObjectType: item.selectedObjectType, selectedObjectId: item.selectedObjectId, purpose: item.title });
      } else {
        void actions.addSlotFromLibrary({
          storyboardId,
          sectionId: section.id,
          selectedObjectType: item.selectedObjectType,
          selectedObjectId: item.selectedObjectId,
          purpose: item.title,
          orderIndex: section.slots.length
        });
      }
      return;
    }
    const slotPayload = event.dataTransfer.getData("application/x-boxbrain-slot");
    if (slotPayload && targetSlotId) {
      const dragged = JSON.parse(slotPayload) as { sectionId: string; slotId: string; orderIndex: number };
      if (dragged.sectionId !== section.id || dragged.slotId === targetSlotId) return;
      const targetSlot = section.slots.find((slot) => slot.id === targetSlotId);
      if (!targetSlot) return;
      void actions.reorderSlots({
        storyboardId,
        updates: [
          { slotId: dragged.slotId, orderIndex: targetSlot.orderIndex },
          { slotId: targetSlotId, orderIndex: dragged.orderIndex }
        ]
      });
    }
  }

  return (
    <div
      draggable={reorderMode}
      onDragStart={reorderMode ? onDragStart : undefined}
      onDragOver={reorderMode ? onDragOver : undefined}
      onDrop={reorderMode ? onDrop : undefined}
      onDragEnd={reorderMode ? onDragEnd : undefined}
      className="card overflow-visible p-0"
      style={{
        borderColor: sectionWarnings.length > 0 ? "var(--warn-border)" : "var(--line)",
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "none",
        transition: "box-shadow .1s, opacity .1s"
      }}
      data-testid="storyboard-section-card"
    >
      <div className="grid grid-cols-[22px_220px_minmax(0,1fr)_128px] items-start gap-3 p-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span
            className="grid h-6 w-3.5 place-items-center rounded"
            style={{ color: reorderMode ? "var(--primary)" : "var(--ink-4)", background: reorderMode ? "var(--primary-bg)" : "transparent", cursor: reorderMode ? "grab" : "default" }}
          >
            <DragHandleIcon />
          </span>
          <div className="flex flex-col gap-0.5">
            <IconButton label={`Move ${section.title} up`} borderless className="h-4.5 w-4.5" onClick={onMoveUp} disabled={index === 0}>
              <ArrowUp size={10} aria-hidden="true" />
            </IconButton>
            <IconButton label={`Move ${section.title} down`} borderless className="h-4.5 w-4.5" onClick={onMoveDown} disabled={index === total - 1}>
              <ArrowDown size={10} aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <div className="border-r border-[var(--line-soft)] pr-2">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="grid h-5.5 w-5.5 place-items-center rounded text-[11px] font-bold"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {index + 1}
            </span>
            {editing ? (
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="min-w-0 flex-1 rounded border border-[var(--line)] px-1.5 py-0.5 text-[13px] font-bold" />
            ) : (
              <b className="min-w-0 flex-1 truncate text-[13px]">{section.title}</b>
            )}
            <IconButton label={editing ? "Cancel edit" : "Edit section"} borderless className="h-5 w-5 shrink-0" onClick={() => (editing ? setEditing(false) : setEditing(true))}>
              <Pencil size={10} aria-hidden="true" />
            </IconButton>
          </div>
          {editing ? (
            <div className="grid gap-1.5">
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} className="w-full rounded border border-[var(--line)] px-1.5 py-1 text-[11px]" />
              <div className="flex gap-1">
                <button type="button" disabled={saving} onClick={saveRename} className="btn btn-xs">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="m-0 text-[11px] leading-snug text-[var(--ink-3)]">{section.summary || "No description yet."}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--ink-3)]">
            <span>
              <b className="font-semibold text-[var(--ink-2)]">{section.slots.length}</b> units
            </span>
            <span>
              <b className="font-semibold text-[var(--ink-2)]">{section.slots.filter((slot) => slot.isRequired).length}</b> required
            </span>
            {sectionWarnings.length > 0 && (
              <span className="flex items-center gap-1" style={{ color: "var(--warn)" }}>
                <AlertTriangle size={11} aria-hidden="true" /> {sectionWarnings.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap content-start gap-2">
          {section.slots.map((slot) => (
            <SlotChip
              key={slot.id}
              slot={slot}
              sectionId={section.id}
              detail={slotDetailFor(slot, objectDetails)}
              warnings={warningsForSlot(warnings, slot)}
              selected={selectedSlot?.sectionId === section.id && selectedSlot?.slotId === slot.id}
              trackChanges={trackChanges}
              reorderMode={reorderMode}
              filters={filters}
              onSelect={() => onSelectSlot(section.id, slot.id)}
              onRequestSwap={() => onRequestSwap({ kind: "swap", slotId: slot.id, sectionId: section.id, label: slotTitle(slot, slotDetailFor(slot, objectDetails)) })}
              onDrop={(event) => handleTrayDrop(event, slot.id)}
            />
          ))}
          <div
            onClick={() => onRequestAdd({ kind: "add", sectionId: section.id, label: section.title, orderIndex: section.slots.length })}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleTrayDrop(event)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => (event.key === "Enter" ? onRequestAdd({ kind: "add", sectionId: section.id, label: section.title, orderIndex: section.slots.length }) : undefined)}
            className="flex min-h-[92px] w-[116px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-[var(--line-2)] bg-[var(--bg)] text-center text-[10px] text-[var(--ink-3)] hover:border-[var(--primary-border)]"
            aria-label={`Add content unit to ${section.title}`}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add content unit</span>
            <span className="text-[9px] text-[var(--ink-4)]">or drop from library</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void actions.addGapSlot({ storyboardId, sectionId: section.id, purpose: `Gap in ${section.title} — needs content`, orderIndex: section.slots.length });
              }}
              className="link mt-0.5 text-[9px]"
            >
              or mark as gap
            </button>
          </div>
        </div>

        <div className="border-l border-[var(--line-soft)] pl-2.5 text-[10px]">
          <div className="mb-1 font-medium text-[var(--ink-3)]">Diagnostics</div>
          {sectionWarnings.length === 0 ? (
            <Badge kind="ok">clear</Badge>
          ) : (
            <div className="grid gap-1">
              {sectionWarnings.slice(0, 3).map((warning) => (
                <Tag key={`${warning.code}-${warning.targetId}`} tone={warning.severity === "critical" ? "danger" : warning.severity === "warning" ? "warn" : "neutral"} size="sm">
                  {warning.code.replaceAll("_", " ")}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotChip({
  slot,
  sectionId,
  detail,
  warnings,
  selected,
  trackChanges,
  reorderMode,
  filters,
  onSelect,
  onRequestSwap,
  onDrop
}: {
  slot: StoryboardSlot;
  sectionId: string;
  detail?: SlotObjectDetail;
  warnings: StoryboardDiagnosticWarning[];
  selected: boolean;
  trackChanges: boolean;
  reorderMode: boolean;
  filters: CanvasFilters;
  onSelect: () => void;
  onRequestSwap: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const isGap = slot.slotType === "gap" || !slot.selectedObjectId;
  const flagged = trackChanges && (slot.aiRecommended || warnings.length > 0);
  const title = slotTitle(slot, detail);
  const dimmed = (filters.onlyGaps && !isGap) || (filters.approval.size > 0 && !!detail?.approvalState && !filters.approval.has(detail.approvalState));

  return (
    <div
      draggable={reorderMode && !isGap}
      onDragStart={(event) => event.dataTransfer.setData("application/x-boxbrain-slot", JSON.stringify({ sectionId, slotId: slot.id, orderIndex: slot.orderIndex }))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => (event.key === "Enter" ? onSelect() : undefined)}
      className="relative w-[148px] cursor-pointer"
      style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity .15s" }}
      data-testid="storyboard-slot-chip"
    >
      <div
        className="card p-1.5"
        style={{
          border: `${selected ? 2 : 1}px solid ${selected ? "var(--primary)" : flagged ? "var(--ai-border)" : isGap ? "var(--warn-border)" : "var(--line)"}`,
          boxShadow: selected ? "0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent)" : "none",
          background: isGap ? "var(--bg)" : "var(--paper)"
        }}
      >
        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-[var(--ink-2)]">
          {reorderMode && !isGap && <DragHandleIcon size={9} />}
          <ObjectTypeIcon type={slot.selectedObjectType} size={10} color={isGap ? "var(--warn)" : "var(--primary)"} />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {slot.aiRecommended && <Sparkles size={9} color="var(--ai)" aria-hidden="true" />}
        </div>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded" style={{ background: isGap ? "transparent" : "var(--bg-2)" }}>
          {isGap ? (
            <div className="flex flex-col items-center gap-1 text-center text-[9.5px] text-[var(--warn)]">
              <Plus size={13} aria-hidden="true" />
              <span>Add content unit</span>
            </div>
          ) : (
            <ObjectTypeIcon type={slot.selectedObjectType} size={20} color="var(--ink-3)" />
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px]">
          <span className="muted">{slot.slotType}</span>
          {detail?.qualityScore != null && (
            <span style={{ color: detail.qualityScore >= 0.9 ? "var(--ok)" : "var(--primary)", fontWeight: 600 }}>{Math.round(detail.qualityScore <= 1 ? detail.qualityScore * 100 : detail.qualityScore)}%</span>
          )}
        </div>
        {!isGap && slot.selectedObjectId && <div className="mt-1 truncate font-mono text-[8.5px] text-[var(--ink-4)]">{slot.selectedObjectId}</div>}
        {detail && (
          <div className="mt-1 flex flex-wrap gap-1">
            {detail.approvalState && <Badge kind={approvalTone(detail.approvalState)}>{detail.approvalState}</Badge>}
            {detail.freshnessState && <Badge kind={freshnessTone(detail.freshnessState)}>{detail.freshnessState}</Badge>}
          </div>
        )}
      </div>
      {!isGap && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRequestSwap();
          }}
          className="icon-btn borderless absolute right-1 top-1 h-5 w-5 bg-[var(--paper)]"
          aria-label={`Swap content for ${title}`}
          title="Swap content"
        >
          <Replace size={10} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
