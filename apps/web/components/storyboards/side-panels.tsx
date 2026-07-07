"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, CornerDownRight, GitCompare, MessageSquarePlus, Send } from "lucide-react";
import { Avatar, Badge, Button, Card, Chip, StatusBadge, Tag } from "@/components/ui";
import type { Comment, StoryboardDetail, StoryboardDiagnosticWarning, StoryboardSection, StoryboardSnapshot } from "@/lib/api";
import { anchorValue, diffSnapshots, formatDateTime, groupCommentThreads } from "@/features/storyboards/lib";

const UNKNOWN_AUTHOR = "Team";

export function DiagnosticsPanel({ warnings, narrativeScore }: { warnings: StoryboardDiagnosticWarning[]; narrativeScore?: number | null }) {
  const score = narrativeScore == null ? null : Math.round(narrativeScore * 100);
  return (
    <Card className="p-4" id="storyboard-diagnostics-panel" data-testid="storyboard-diagnostics-panel">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <AlertTriangle size={16} color="var(--warn)" aria-hidden="true" /> Diagnostics ({warnings.length})
      </div>
      <div className="mb-3">{score == null ? <Tag>not scored</Tag> : <StatusBadge tone={score >= 80 ? "ok" : "warn"}>{score} narrative</StatusBadge>}</div>
      {warnings.length === 0 ? (
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">No diagnostics warnings returned.</div>
      ) : (
        <div className="grid gap-2 text-sm">
          {warnings.map((warning) => (
            <div
              key={`${warning.code}-${warning.targetId ?? warning.message}`}
              className={`rounded-lg p-3 ${warning.severity === "critical" ? "bg-red-50 text-red-800" : warning.severity === "warning" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
            >
              <div className="font-bold">{warning.code}</div>
              <div>{warning.message}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SnapshotPanel({
  storyboard,
  snapshots,
  selectedSnapshot,
  createSnapshotAction
}: {
  storyboard: StoryboardDetail;
  snapshots: StoryboardSnapshot[];
  selectedSnapshot?: StoryboardSnapshot;
  createSnapshotAction: (formData: FormData) => void | Promise<void>;
}) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState(snapshots[0]?.id ?? "");
  const [compareRightId, setCompareRightId] = useState(snapshots[1]?.id ?? "");
  const left = snapshots.find((snapshot) => snapshot.id === compareLeftId);
  const right = snapshots.find((snapshot) => snapshot.id === compareRightId);
  const diff = left && right ? diffSnapshots(left, right) : [];

  return (
    <Card className="p-4" data-testid="storyboard-snapshot-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Camera size={16} aria-hidden="true" /> Snapshot history
        </div>
        <button type="button" className="link text-xs" onClick={() => setCompareOpen((value) => !value)} disabled={snapshots.length < 2} title={snapshots.length < 2 ? "Create another snapshot to compare." : undefined}>
          <GitCompare size={12} className="mr-1 inline" aria-hidden="true" /> Compare
        </button>
      </div>

      <form action={createSnapshotAction} className="mb-3 flex gap-2">
        <input type="hidden" name="storyboardId" value={storyboard.id} />
        <input name="versionLabel" className="w-28 rounded-lg border border-slate-200 px-2 text-xs" placeholder="v1" />
        <Button type="submit" size="sm">
          <Camera size={12} aria-hidden="true" /> Save Version
        </Button>
      </form>

      {compareOpen && snapshots.length >= 2 && (
        <div className="mb-3 rounded-lg border border-[var(--line)] p-2.5">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <select value={compareLeftId} onChange={(event) => setCompareLeftId(event.target.value)} className="rounded border border-[var(--line)] bg-white px-1.5 py-1 text-xs">
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.versionLabel ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select value={compareRightId} onChange={(event) => setCompareRightId(event.target.value)} className="rounded border border-[var(--line)] bg-white px-1.5 py-1 text-xs">
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.versionLabel ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          {diff.length === 0 ? (
            <div className="text-xs text-[var(--ink-3)]">No structural differences between these two snapshots.</div>
          ) : (
            <div className="grid gap-1 text-xs">
              {diff.slice(0, 12).map((entry, index) => (
                <div key={index} className="text-[var(--ink-2)]">
                  {entry.label}
                </div>
              ))}
              {diff.length > 12 && <div className="muted">+{diff.length - 12} more</div>}
            </div>
          )}
        </div>
      )}

      {snapshots.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No immutable snapshots have been saved.</p>
      ) : (
        <div className="grid gap-2">
          {snapshots.map((snapshot) => (
            <Link key={snapshot.id} href={`/storyboards/${storyboard.id}?snapshotId=${snapshot.id}`} className="rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{snapshot.versionLabel ?? snapshot.id.slice(0, 8)}</span>
                <Badge kind={snapshot.approvalState === "approved" ? "ok" : snapshot.approvalState === "review" ? "warn" : "neutral"}>{snapshot.approvalState}</Badge>
              </div>
              <div className="text-xs text-slate-500">
                {formatDateTime(snapshot.createdAt)} · {snapshot.sections.length} sections
              </div>
            </Link>
          ))}
        </div>
      )}

      {selectedSnapshot && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-sm font-bold">Snapshot detail</div>
          <div className="grid gap-2 text-xs text-slate-600">
            <div>{selectedSnapshot.versionLabel ?? selectedSnapshot.id}</div>
            <div>
              {selectedSnapshot.sections.length} frozen sections · {selectedSnapshot.sections.flatMap((section) => section.slots).length} frozen slots
            </div>
            <div>Approval: {selectedSnapshot.approvalState}</div>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              disabled
              className="btn btn-xs"
              title="Snapshot approval state has no PATCH/command endpoint yet (audit-digest.md ## storyboard API[no])."
            >
              Approve
            </button>
            <button
              type="button"
              disabled
              className="btn btn-xs"
              title="Snapshot approval state has no PATCH/command endpoint yet (audit-digest.md ## storyboard API[no])."
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

type CommentTypeFilter = "all" | "review_comment" | "persistent_comment" | "note_discussion";

export function CommentsPanel({
  storyboardId,
  comments,
  sections,
  createAnchoredCommentAction
}: {
  storyboardId: string;
  comments: Comment[];
  sections: StoryboardSection[];
  createAnchoredCommentAction: (formData: FormData) => void | Promise<void>;
}) {
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CommentTypeFilter>("all");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const filtered = comments.filter((comment) => {
    if (unresolvedOnly && comment.status !== "open") return false;
    if (typeFilter !== "all" && comment.kind !== typeFilter) return false;
    return true;
  });
  const threads = groupCommentThreads(filtered);

  return (
    <Card className="p-4" data-testid="storyboard-comments-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold">Comments ({comments.length})</h2>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Chip active={unresolvedOnly} onClick={() => setUnresolvedOnly((value) => !value)}>
          Unresolved only
        </Chip>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as CommentTypeFilter)} className="rounded border border-[var(--line)] bg-white px-1.5 py-1 text-xs">
          <option value="all">All types</option>
          <option value="persistent_comment">Persistent comments</option>
          <option value="review_comment">Review comments</option>
          <option value="note_discussion">Note discussions</option>
        </select>
      </div>

      {threads.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No storyboard comments match these filters.</p>
      ) : (
        <div className="grid gap-1">
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                <span>{anchorLabel(root, sections)}</span>
                {root.status !== "open" && <Badge kind="neutral">{root.status}</Badge>}
              </div>
              <CommentRow comment={root} />
              {replies.map((reply) => (
                <div key={reply.id} className="ml-5 mt-1.5 flex items-start gap-1.5">
                  <CornerDownRight size={11} className="mt-1 shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
                  <CommentRow comment={reply} compact />
                </div>
              ))}
              {replyTo === root.id ? (
                <form action={createAnchoredCommentAction} className="ml-5 mt-1.5 flex items-start gap-1.5" onSubmit={() => setReplyTo(null)}>
                  <input type="hidden" name="storyboardId" value={storyboardId} />
                  <input type="hidden" name="targetAnchor" value={`${anchorValue(root, "sectionId") ?? ""}|${anchorValue(root, "slotId") ?? ""}`} />
                  <input type="hidden" name="parentCommentId" value={root.id} />
                  <textarea name="body" required rows={1} placeholder="Reply…" className="min-h-7 flex-1 resize-none rounded border border-[var(--line)] px-1.5 py-1 text-[11px]" />
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

      <form action={createAnchoredCommentAction} className="mt-3 flex items-center gap-1.5 rounded-md bg-[var(--bg-2)] p-2">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <input type="hidden" name="targetAnchor" value="|" />
        <Avatar who={UNKNOWN_AUTHOR} className="sm" />
        <input name="body" required placeholder="Add a storyboard-level comment…" className="min-w-0 flex-1 border-0 bg-transparent text-[11px] outline-none placeholder:text-[var(--ink-3)]" />
        <button type="submit" className="icon-btn borderless h-6 w-6 shrink-0" aria-label="Add comment">
          <MessageSquarePlus size={13} aria-hidden="true" />
        </button>
      </form>
    </Card>
  );
}

function CommentRow({ comment, compact }: { comment: Comment; compact?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Avatar who={UNKNOWN_AUTHOR} className="sm" />
      <div className="min-w-0 flex-1 text-xs">
        <div className="flex items-center gap-1.5">
          <b>{UNKNOWN_AUTHOR}</b>
          <span className="muted text-[10.5px]">{formatDateTime(comment.createdAt)}</span>
        </div>
        <div className="mt-0.5 text-[var(--ink-2)]">{comment.body}</div>
        {!compact && <div className="muted mt-0.5 text-[10px]">{comment.kind.replaceAll("_", " ")}</div>}
      </div>
    </div>
  );
}

function anchorLabel(comment: Comment, sections: StoryboardSection[]): string {
  const slotId = anchorValue(comment, "slotId");
  const sectionId = anchorValue(comment, "sectionId");
  if (slotId) {
    const section = sections.find((candidate) => candidate.slots.some((slot) => slot.id === slotId));
    const slot = section?.slots.find((candidate) => candidate.id === slotId);
    return `${section?.title ?? "Section"} / ${slot?.purpose ?? "slot"}`;
  }
  if (sectionId) {
    const section = sections.find((candidate) => candidate.id === sectionId);
    return section?.title ?? "Section";
  }
  return "Storyboard";
}
