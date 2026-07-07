"use client";

import { useState } from "react";
import Link from "next/link";
import { CornerDownRight, ExternalLink, MessageSquarePlus, NotebookPen, Pencil, Replace, Send, Sparkles, X } from "lucide-react";
import { Avatar, Badge, Tag } from "@/components/ui";
import type { Comment, StoryboardDiagnosticWarning, StoryboardSection, StoryboardSlot } from "@/lib/api";
import { ActivityTimeline } from "@/components/content-units/activity-timeline";
import { ProvenanceGrid } from "@/components/content-units/provenance-grid";
import { RatingsQualityCard } from "@/components/content-units/ratings-quality";
import { WhereUsedList } from "@/components/content-units/where-used-list";
import { NotesList } from "@/components/content-units/notes-panel";
import { buildActivityTimeline, formatDateTime } from "@/features/content-units/lib";
import {
  approvalTone,
  commentsForSlot,
  freshnessTone,
  groupCommentThreads,
  slotTitle,
  type SlotObjectDetail
} from "@/features/storyboards/lib";
import { ObjectTypeIcon } from "./object-icon";
import type { StoryboardActions } from "./types";

type InspectorTab = "details" | "notes" | "meta" | "activity" | "ai";

const UNKNOWN_AUTHOR = "Team";

export function SlideInspector({
  slot,
  section,
  storyboardId,
  detail,
  warnings,
  comments,
  onClose,
  onRequestSwap,
  actions
}: {
  slot: StoryboardSlot;
  section: StoryboardSection;
  storyboardId: string;
  detail?: SlotObjectDetail;
  warnings: StoryboardDiagnosticWarning[];
  comments: Comment[];
  onClose: () => void;
  onRequestSwap: () => void;
  actions: StoryboardActions;
}) {
  const [tab, setTab] = useState<InspectorTab>("details");
  const isGap = slot.slotType === "gap" || !slot.selectedObjectId;
  const title = slotTitle(slot, detail);
  const slideComments = commentsForSlot(comments, slot.id);

  return (
    <aside className="card sticky top-4 flex max-h-[calc(100vh-40px)] flex-col overflow-hidden p-0" data-testid="storyboard-slide-inspector">
      <div className="border-b border-[var(--line)] p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ObjectTypeIcon type={slot.selectedObjectType} size={14} color="var(--primary)" />
            <b className="min-w-0 flex-1 truncate text-[13px]">{title}</b>
          </div>
          <button type="button" onClick={onClose} className="icon-btn borderless h-5.5 w-5.5" aria-label="Close inspector">
            <X size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--ink-3)]">
          <span>{section.title}</span>
          <span>·</span>
          <span>{slot.slotType}</span>
          {slot.aiRecommended && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1" style={{ color: "var(--ai)" }}>
                <Sparkles size={10} aria-hidden="true" /> AI-recommended
              </span>
            </>
          )}
        </div>
      </div>

      {!isGap && (
        <div className="border-b border-[var(--line-soft)] p-3">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-2)]">
            <ObjectTypeIcon type={slot.selectedObjectType} size={28} color="var(--ink-3)" />
          </div>
          <div className="mt-2 flex items-center gap-1">
            {detail && (
              <Link href={detail.href} className="btn btn-xs flex-1 justify-center">
                <Pencil size={10} aria-hidden="true" /> Edit
              </Link>
            )}
            <button type="button" onClick={onRequestSwap} className="btn btn-xs flex-1 justify-center">
              <Replace size={10} aria-hidden="true" /> Swap
            </button>
            {detail && (
              <Link href={detail.href} target="_blank" className="icon-btn h-6.5 w-6.5" aria-label="Open full record in a new tab">
                <ExternalLink size={11} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 border-b border-[var(--line-soft)] text-[10.5px]">
        {(
          [
            { id: "details" as const, label: "Details" },
            { id: "notes" as const, label: "Notes" },
            { id: "meta" as const, label: "Meta" },
            { id: "activity" as const, label: "Activity" },
            { id: "ai" as const, label: "AI", ai: true }
          ]
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className="flex items-center justify-center gap-1 border-b-2 px-1 py-1.5"
            style={{ borderColor: tab === option.id ? (option.ai ? "var(--ai)" : "var(--primary)") : "transparent", color: tab === option.id ? (option.ai ? "var(--ai)" : "var(--primary)") : "var(--ink-3)" }}
          >
            {option.ai && <Sparkles size={10} aria-hidden="true" />}
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-[11.5px]">
        {tab === "details" && <DetailsTab slot={slot} detail={detail} isGap={isGap} />}
        {tab === "notes" && (
          <NotesTab
            slot={slot}
            detail={detail}
            isGap={isGap}
            storyboardId={storyboardId}
            slideComments={slideComments}
            actions={actions}
          />
        )}
        {tab === "meta" && <MetaTab slot={slot} section={section} detail={detail} />}
        {tab === "activity" && <ActivityTab slot={slot} detail={detail} />}
        {tab === "ai" && <AiTab slot={slot} warnings={warnings} />}
      </div>
    </aside>
  );
}

function DetailsTab({ slot, detail, isGap }: { slot: StoryboardSlot; detail?: SlotObjectDetail; isGap: boolean }) {
  if (isGap) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--warn-border)] bg-[var(--warn-bg)] p-3 text-[var(--warn)]">
        This slot is a gap. Drag a content unit onto it from the library, or click the dropzone in the canvas.
      </div>
    );
  }
  if (!detail) {
    return <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-[var(--ink-3)]">Detail could not be loaded for this object.</div>;
  }
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Content</div>
      <Link href={detail.href} className="link text-[12px] font-medium">
        {detail.displayTitle ?? slot.purpose ?? "Open full record"}
      </Link>
      <div className="mono mt-0.5 text-[10px] text-[var(--ink-3)]">{slot.selectedObjectId}</div>
      {detail.summary && <p className="mt-2 text-[var(--ink-2)]">{detail.summary}</p>}

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[11px]">
        <span className="muted">Slot purpose</span>
        <span>{slot.purpose ?? "Not set"}</span>
        <span className="muted">Required</span>
        <span>{slot.isRequired ? "Yes" : "No"}</span>
        {detail.approvalState && (
          <>
            <span className="muted">Approval</span>
            <Badge kind={approvalTone(detail.approvalState)}>{detail.approvalState}</Badge>
          </>
        )}
        {detail.freshnessState && (
          <>
            <span className="muted">Freshness</span>
            <Badge kind={freshnessTone(detail.freshnessState)}>{detail.freshnessState}</Badge>
          </>
        )}
        {detail.kind === "content_block_version" && detail.memberCount != null && (
          <>
            <span className="muted">Block members</span>
            <span>{detail.memberCount}</span>
          </>
        )}
        {detail.kind === "work_product_version" && detail.artifactType && (
          <>
            <span className="muted">Artifact type</span>
            <span>{detail.artifactType}</span>
          </>
        )}
      </div>

      {detail.kind === "content_unit_version" && (
        <>
          <div className="mt-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Quality &amp; usage</div>
          <RatingsQualityCard qualityScore={detail.qualityScore} usageScore={detail.usageScore} />

          <div className="mt-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Used in ({detail.whereUsed.length})</div>
          <WhereUsedList items={detail.whereUsed} limit={4} />

          <div className="mt-3 text-[10.5px]">
            <Link href={detail.href} className="link">
              Compare variants &amp; versions →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function NotesTab({
  slot,
  detail,
  isGap,
  storyboardId,
  slideComments,
  actions
}: {
  slot: StoryboardSlot;
  detail?: SlotObjectDetail;
  isGap: boolean;
  storyboardId: string;
  slideComments: Comment[];
  actions: StoryboardActions;
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const threads = groupCommentThreads(slideComments);

  return (
    <div>
      {!isGap && detail?.kind === "content_unit_version" && (
        <>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Speaker notes</div>
          {detail.speakerNotes ? (
            <div className="rounded-md border border-[var(--line)] bg-[var(--bg)] p-2.5 leading-relaxed text-[var(--ink-2)]">{detail.speakerNotes}</div>
          ) : (
            <div className="rounded-md border border-dashed border-[var(--line-2)] p-2.5 text-[var(--ink-3)]">No speaker notes recorded for this version.</div>
          )}
        </>
      )}

      {!isGap && detail && (
        <>
          <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">
            Notes on this content ({detail.notes.length})
          </div>
          <NotesList notes={detail.notes} limit={3} />
          <form action={actions.createSlotObjectNote} className="mt-2 grid gap-1.5 rounded-md border border-[var(--line)] p-2">
            <input type="hidden" name="storyboardId" value={storyboardId} />
            <input type="hidden" name="targetType" value={slot.selectedObjectType ?? ""} />
            <input type="hidden" name="targetId" value={slot.selectedObjectId ?? ""} />
            <textarea name="body" required rows={2} placeholder="Add an editorial note about this content…" className="min-h-14 rounded border border-[var(--line)] px-2 py-1 text-[11px]" />
            <button type="submit" className="btn btn-xs justify-center">
              <NotebookPen size={10} aria-hidden="true" /> Add note
            </button>
          </form>
        </>
      )}

      <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">On this slide ({slideComments.length})</div>
      {threads.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--line-2)] p-2.5 text-[var(--ink-3)]">No comments on this placement yet.</div>
      ) : (
        <div className="grid gap-1">
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
              <CommentRow comment={root} />
              {replies.map((reply) => (
                <div key={reply.id} className="ml-5 mt-1.5 flex items-start gap-1.5">
                  <CornerDownRight size={11} className="mt-1 shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
                  <CommentRow comment={reply} compact />
                </div>
              ))}
              {replyTo === root.id ? (
                <form action={actions.createAnchoredComment} className="ml-5 mt-1.5 flex items-start gap-1.5" onSubmit={() => setReplyTo(null)}>
                  <input type="hidden" name="storyboardId" value={storyboardId} />
                  <input type="hidden" name="targetAnchor" value={`${slot.sectionId}|${slot.id}`} />
                  <input type="hidden" name="parentCommentId" value={root.id} />
                  <textarea name="body" required rows={1} autoFocus placeholder="Reply…" className="min-h-7 flex-1 resize-none rounded border border-[var(--line)] px-1.5 py-1 text-[11px]" />
                  <button type="submit" className="icon-btn h-6.5 w-6.5 shrink-0" aria-label="Send reply">
                    <Send size={11} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button type="button" className="link ml-5 mt-1 text-[10.5px]" onClick={() => setReplyTo(root.id)}>
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <form action={actions.createAnchoredComment} className="mt-2.5 flex items-center gap-1.5 rounded-md bg-[var(--bg-2)] p-2">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <input type="hidden" name="targetAnchor" value={`${slot.sectionId}|${slot.id}`} />
        <Avatar who={UNKNOWN_AUTHOR} className="sm" />
        <input name="body" required placeholder="Add a comment…" className="min-w-0 flex-1 border-0 bg-transparent text-[11px] outline-none placeholder:text-[var(--ink-3)]" />
        <button type="submit" className="icon-btn borderless h-6 w-6 shrink-0" aria-label="Add comment">
          <MessageSquarePlus size={13} aria-hidden="true" />
        </button>
      </form>

      {!isGap && detail && detail.comments.length > 0 && (
        <>
          <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">On this content ({detail.comments.length})</div>
          <div className="grid gap-1.5">
            {detail.comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="rounded-md bg-[var(--bg-2)] p-2 text-[11px] text-[var(--ink-2)]">
                {comment.body}
                <div className="muted mt-0.5 text-[10px]">{formatDateTime(comment.createdAt)}</div>
              </div>
            ))}
          </div>
          <Link href={detail.href} className="link mt-1 inline-block text-[10.5px]">
            View all on the full record →
          </Link>
        </>
      )}
    </div>
  );
}

function CommentRow({ comment, compact }: { comment: Comment; compact?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Avatar who={UNKNOWN_AUTHOR} className="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <b className="text-[var(--ink)]">{UNKNOWN_AUTHOR}</b>
          <span className="muted text-[10.5px]">{formatDateTime(comment.createdAt)}</span>
          {!compact && comment.status !== "open" && <span className="muted text-[10.5px]">· {comment.status}</span>}
        </div>
        <div className="mt-0.5 text-[var(--ink-2)]">{comment.body}</div>
      </div>
    </div>
  );
}

function MetaTab({ slot, section, detail }: { slot: StoryboardSlot; section: StoryboardSection; detail?: SlotObjectDetail }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Slot</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[11px]">
        <span className="muted">Slot ID</span>
        <span className="mono">{slot.id}</span>
        <span className="muted">Section</span>
        <span>{section.title}</span>
        <span className="muted">Slot type</span>
        <span>{slot.slotType}</span>
        <span className="muted">Order index</span>
        <span>{slot.orderIndex}</span>
      </div>

      {detail?.kind === "content_unit_version" && (
        <>
          <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Provenance</div>
          <ProvenanceGrid provenance={detail.provenance} tags={[]} />
          {detail.versionNumber && (
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[11px]">
              <span className="muted">Version</span>
              <span>{detail.versionNumber}</span>
              {detail.variantId && (
                <>
                  <span className="muted">Variant ID</span>
                  <span className="mono">{detail.variantId}</span>
                </>
              )}
            </div>
          )}
        </>
      )}

      {detail && detail.kind !== "content_unit_version" && (
        <div className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[11px]">
          <span className="muted">Object ID</span>
          <span className="mono">{slot.selectedObjectId}</span>
          <span className="muted">Created</span>
          <span>{formatDateTime(detail.createdAt)}</span>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ slot, detail }: { slot: StoryboardSlot; detail?: SlotObjectDetail }) {
  if (!detail) return <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-[var(--ink-3)]">No object is bound to this slot yet.</div>;
  const events = buildActivityTimeline({
    versions:
      detail.kind === "content_unit_version" && detail.versionNumber && detail.createdAt && slot.selectedObjectId
        ? [{ version: { id: slot.selectedObjectId, variantId: detail.variantId ?? "", versionNumber: detail.versionNumber, approvalState: detail.approvalState ?? "draft", createdAt: detail.createdAt } }]
        : [],
    comments: detail.comments,
    notes: detail.notes
  });
  return <ActivityTimeline events={events} />;
}

function AiTab({ slot, warnings }: { slot: StoryboardSlot; warnings: StoryboardDiagnosticWarning[] }) {
  return (
    <div>
      <div className="ai-panel">
        <h4>
          <Sparkles size={14} aria-hidden="true" /> AI signal
          <span className="beta">BETA</span>
        </h4>
        <div className="ai-body">
          {slot.aiRecommended
            ? "This slot's content was selected by an AI-assisted recommendation when it was added. Suggestion-and-apply actions for existing slots aren't wired to a backend endpoint yet."
            : "This slot's content was chosen manually. There is no AI recommendation for this specific slot."}
        </div>
      </div>

      <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Diagnostics for this slot</div>
      {warnings.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--line-2)] p-2.5 text-[var(--ink-3)]">No open warnings.</div>
      ) : (
        <div className="grid gap-1.5">
          {warnings.map((warning) => (
            <div key={`${warning.code}-${warning.targetId}`} className="flex items-start gap-2 rounded-md p-2" style={{ background: warning.severity === "critical" ? "var(--danger-bg)" : warning.severity === "warning" ? "var(--warn-bg)" : "var(--info-bg)" }}>
              <Tag tone={warning.severity === "critical" ? "danger" : warning.severity === "warning" ? "warn" : "neutral"} size="sm">
                {warning.code.replaceAll("_", " ")}
              </Tag>
              <span className="text-[11px]">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-1.5 mt-3.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">Suggestions</div>
      <div
        className="rounded-md border border-dashed border-[var(--ai-border)] p-2.5 text-[var(--ink-3)]"
        title="Slot-level AI suggestions with an Apply action require a suggestions/candidates endpoint that does not exist yet (audit-digest.md ## storyboard API[no])."
      >
        AI suggestions for individual slots aren&rsquo;t available yet.
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-md border border-[var(--ai-border)] bg-[var(--paper)] p-1.5 opacity-60">
        <Sparkles size={12} color="var(--ai)" aria-hidden="true" />
        <input disabled placeholder="Ask about this slide… (not connected)" className="min-w-0 flex-1 border-0 bg-transparent text-[11px] outline-none" />
      </div>
    </div>
  );
}

