"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { Eye, GitCompare, PackageCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Comment, ContentBlockVersionDetail, StoryboardDetail, StoryboardDiagnostics, StoryboardSnapshot } from "@/lib/api";
import { countSlots, formatRelative, type SlotObjectDetail } from "@/features/storyboards/lib";
import { InsertSectionDivider, SectionCard } from "./canvas";
import { CanvasToolbar, type CanvasFilters } from "./toolbar";
import { LibraryTray } from "./library-tray";
import { SlideInspector } from "./inspector";
import { CommentsPanel, DiagnosticsPanel, SnapshotPanel } from "./side-panels";
import { MetricsStrip } from "./metrics-strip";
import type { PendingTarget, StoryboardActions, TrayItem } from "./types";

export function StoryboardWorkspace({
  storyboard,
  snapshots,
  selectedSnapshot,
  diagnostics,
  comments,
  contentBlocks,
  objectDetails,
  actions
}: {
  storyboard: StoryboardDetail;
  snapshots: StoryboardSnapshot[];
  selectedSnapshot?: StoryboardSnapshot;
  diagnostics: StoryboardDiagnostics;
  comments: Comment[];
  contentBlocks: ContentBlockVersionDetail[];
  objectDetails: Record<string, SlotObjectDetail>;
  actions: StoryboardActions;
}) {
  const sortedSections = useMemo(() => [...storyboard.draftSections].sort((left, right) => left.orderIndex - right.orderIndex), [storyboard.draftSections]);
  const [orderIds, setOrderIds] = useState<string[]>(sortedSections.map((section) => section.id));
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ sectionId: string; slotId: string } | null>(null);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [trackChanges, setTrackChanges] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [filters, setFilters] = useState<CanvasFilters>({ onlyGaps: false, approval: new Set() });

  useEffect(() => {
    setOrderIds(sortedSections.map((section) => section.id));
  }, [sortedSections]);

  const sectionsById = useMemo(() => new Map(sortedSections.map((section) => [section.id, section])), [sortedSections]);
  const orderedSections = orderIds.map((id) => sectionsById.get(id)).filter((section): section is (typeof sortedSections)[number] => Boolean(section));
  const totalSlots = countSlots(sortedSections);
  const selectedSection = selectedSlot ? sectionsById.get(selectedSlot.sectionId) : undefined;
  const selectedSlotObj = selectedSection?.slots.find((slot) => slot.id === selectedSlot?.slotId);

  function persistOrder(nextOrder: string[]) {
    const sectionRefs = sortedSections.map((section) => ({ id: section.id, title: section.title, summary: section.summary, orderIndex: section.orderIndex }));
    void actions.reorderSections({ storyboardId: storyboard.id, sections: sectionRefs, orderedIds: nextOrder });
  }

  function handleSectionDragOver(event: DragEvent<HTMLDivElement>, overId: string) {
    event.preventDefault();
    if (!draggingSectionId || draggingSectionId === overId) return;
    setOrderIds((current) => {
      const from = current.indexOf(draggingSectionId);
      const to = current.indexOf(overId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, draggingSectionId);
      return next;
    });
  }

  function moveSection(id: string, direction: -1 | 1) {
    const index = orderIds.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= orderIds.length) return;
    const next = [...orderIds];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderIds(next);
    persistOrder(next);
  }

  async function handlePickLibraryItem(item: TrayItem) {
    if (pendingTarget?.kind === "add") {
      await actions.addSlotFromLibrary({
        storyboardId: storyboard.id,
        sectionId: pendingTarget.sectionId,
        selectedObjectType: item.selectedObjectType,
        selectedObjectId: item.selectedObjectId,
        purpose: item.title,
        orderIndex: pendingTarget.orderIndex
      });
      setPendingTarget(null);
      return;
    }
    if (pendingTarget?.kind === "swap") {
      await actions.swapSlotContent({ storyboardId: storyboard.id, slotId: pendingTarget.slotId, selectedObjectType: item.selectedObjectType, selectedObjectId: item.selectedObjectId, purpose: item.title });
      setPendingTarget(null);
      return;
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-xl font-bold tracking-tight">{storyboard.title}</h1>
            {selectedSnapshot ? (
              <>
                <span className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-3)]">
                  {selectedSnapshot.versionLabel ?? selectedSnapshot.id.slice(0, 8)}
                </span>
                <Badge kind="neutral">Snapshot view (read-only)</Badge>
              </>
            ) : (
              <Badge kind="ai">
                <Eye size={11} aria-hidden="true" /> Editing draft
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--ink-3)]">
            <span className="flex items-center gap-1">
              <RefreshCw size={10} aria-hidden="true" /> Updated {formatRelative(storyboard.updatedAt)}
            </span>
            <span>·</span>
            <span>
              {sortedSections.length} sections · {totalSlots} units
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm"
            disabled={snapshots.length < 2}
            title={snapshots.length < 2 ? "Create another snapshot to compare." : "Open snapshot compare"}
            onClick={() => document.getElementById("storyboard-snapshot-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <GitCompare size={13} aria-hidden="true" /> Compare snapshots
          </button>
          <Link className="btn btn-primary btn-sm" href="/publish">
            <PackageCheck size={14} aria-hidden="true" /> Publish review
          </Link>
        </div>
      </div>

      <div
        className="items-start gap-3"
        style={{ display: "grid", gridTemplateColumns: `${libraryOpen ? "260px" : "44px"} minmax(0,1fr) 340px`, transition: "grid-template-columns .2s" }}
      >
        <LibraryTray
          open={libraryOpen}
          onToggleOpen={() => setLibraryOpen((value) => !value)}
          sectionOptions={sortedSections.map((section) => ({ id: section.id, title: section.title }))}
          activeSectionId={selectedSlot?.sectionId ?? null}
          contentBlocks={contentBlocks}
          pendingTarget={pendingTarget}
          onCancelPending={() => setPendingTarget(null)}
          onPick={handlePickLibraryItem}
        />

        <div className="min-w-0">
          <CanvasToolbar
            sectionCount={orderedSections.length}
            reorderMode={reorderMode}
            onToggleReorder={() => setReorderMode((value) => !value)}
            showMetrics={showMetrics}
            onToggleMetrics={() => setShowMetrics((value) => !value)}
            trackChanges={trackChanges}
            onToggleTrackChanges={() => setTrackChanges((value) => !value)}
            filters={filters}
            onFiltersChange={setFilters}
          />

          <div className="flex flex-col" data-testid="storyboard-section-list">
            <InsertSectionDivider onCreate={(title, summary) => actions.insertSection({ storyboardId: storyboard.id, title, summary, insertAtIndex: 0, existingSections: sortedSections.map((section) => ({ id: section.id, title: section.title, summary: section.summary, orderIndex: section.orderIndex })) })} />
            {orderedSections.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[var(--ink-3)]">The Storyboard API is reachable, but this storyboard has no editable draft sections yet.</div>
            ) : (
              orderedSections.map((section, index) => (
                <div key={section.id}>
                  <SectionCard
                    section={section}
                    index={index}
                    total={orderedSections.length}
                    storyboardId={storyboard.id}
                    objectDetails={objectDetails}
                    warnings={diagnostics.warnings}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(sectionId, slotId) => {
                      setSelectedSlot({ sectionId, slotId });
                      setPendingTarget(null);
                    }}
                    onRequestAdd={(target) => {
                      setPendingTarget(target);
                      setLibraryOpen(true);
                    }}
                    onRequestSwap={(target) => {
                      setPendingTarget(target);
                      setLibraryOpen(true);
                    }}
                    reorderMode={reorderMode}
                    trackChanges={trackChanges}
                    filters={filters}
                    isDragging={draggingSectionId === section.id}
                    onDragStart={() => setDraggingSectionId(section.id)}
                    onDragOver={(event) => handleSectionDragOver(event, section.id)}
                    onDrop={() => {
                      if (draggingSectionId) persistOrder(orderIds);
                    }}
                    onDragEnd={() => setDraggingSectionId(null)}
                    onMoveUp={() => moveSection(section.id, -1)}
                    onMoveDown={() => moveSection(section.id, 1)}
                    actions={actions}
                  />
                  <InsertSectionDivider
                    onCreate={(title, summary) =>
                      actions.insertSection({
                        storyboardId: storyboard.id,
                        title,
                        summary,
                        insertAtIndex: index + 1,
                        existingSections: sortedSections.map((entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, orderIndex: entry.orderIndex }))
                      })
                    }
                  />
                </div>
              ))
            )}
          </div>

          {showMetrics && (
            <MetricsStrip
              diagnostics={diagnostics}
              sections={sortedSections}
              onReviewWarnings={() => document.getElementById("storyboard-diagnostics-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          )}
        </div>

        {selectedSlot && selectedSection && selectedSlotObj ? (
          <SlideInspector
            slot={selectedSlotObj}
            section={selectedSection}
            storyboardId={storyboard.id}
            detail={
              selectedSlotObj.selectedObjectType && selectedSlotObj.selectedObjectId
                ? objectDetails[`${selectedSlotObj.selectedObjectType}:${selectedSlotObj.selectedObjectId}`]
                : undefined
            }
            warnings={diagnostics.warnings.filter(
              (warning) =>
                (warning.targetType === "storyboard_slot" && warning.targetId === selectedSlotObj.id) ||
                (warning.targetType === "content_unit_version" && warning.targetId === selectedSlotObj.selectedObjectId)
            )}
            comments={comments}
            onClose={() => setSelectedSlot(null)}
            onRequestSwap={() =>
              setPendingTarget({ kind: "swap", slotId: selectedSlotObj.id, sectionId: selectedSection.id, label: selectedSlotObj.purpose ?? "this slide" })
            }
            actions={actions}
          />
        ) : (
          <div className="grid content-start gap-3">
            <DiagnosticsPanel warnings={diagnostics.warnings} narrativeScore={diagnostics.narrativeScore} />
            <div id="storyboard-snapshot-panel">
              <SnapshotPanel storyboard={storyboard} snapshots={snapshots} selectedSnapshot={selectedSnapshot} createSnapshotAction={actions.createSnapshot} />
            </div>
            <CommentsPanel storyboardId={storyboard.id} comments={comments} sections={sortedSections} createAnchoredCommentAction={actions.createAnchoredComment} />
          </div>
        )}
      </div>
    </div>
  );
}
