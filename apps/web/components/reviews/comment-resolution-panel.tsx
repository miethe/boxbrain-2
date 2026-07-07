"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, EmptyState, Tag } from "@/components/ui";
import { boxbrainApi, type Comment } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/features/reviews/format";
import type { LoadState, VersionCacheEntry } from "@/features/reviews/types";
import { ErrorState, LoadingCard, RestrictedCopy } from "./shared";

type ThreadGroup = {
  key: string;
  targetType: string;
  targetId: string;
  comments: Comment[];
  latestAt: string;
};

/**
 * "Comment Resolution" has no dedicated review-queue type or resolve action in the API
 * (audit-digest.md ## reviews, API[partial]) — this pseudo-queue is honestly backed by real open
 * comments from GET /api/comments, grouped by target, with a working reply composer wired to the
 * real POST /api/comments endpoint. There is no "mark resolved" affordance because none exists yet.
 */
export function CommentResolutionPanel({
  comments,
  state,
  errorMessage,
  versionCache,
  ensureVersion
}: {
  comments: Comment[];
  state: LoadState;
  errorMessage: string | null;
  versionCache: Record<string, VersionCacheEntry>;
  ensureVersion: (versionId?: string | null) => void;
}) {
  const groups = useMemo<ThreadGroup[]>(() => {
    const map = new Map<string, ThreadGroup>();
    for (const comment of comments) {
      const key = `${comment.targetType}:${comment.targetId}`;
      const existing = map.get(key);
      if (existing) {
        existing.comments.push(comment);
        if (comment.createdAt && comment.createdAt > existing.latestAt) existing.latestAt = comment.createdAt;
      } else {
        map.set(key, { key, targetType: comment.targetType, targetId: comment.targetId, comments: [comment], latestAt: comment.createdAt ?? "" });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.latestAt ?? "").localeCompare(a.latestAt ?? ""));
  }, [comments]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (groups.length > 0 && !groups.some((group) => group.key === selectedKey)) setSelectedKey(groups[0].key);
    if (groups.length === 0) setSelectedKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  useEffect(() => {
    for (const group of groups) {
      if (group.targetType === "content_unit_version") ensureVersion(group.targetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  if (state === "loading") return <LoadingCard title="Loading open comments" body="Fetching every open review/persistent comment from GET /api/comments." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message={errorMessage ?? "Comments failed to load."} />;
  if (state === "empty" || groups.length === 0) return <EmptyState title="No open comments" body="There are no open comments across the catalog right now." />;

  const selected = groups.find((group) => group.key === selectedKey) ?? groups[0];

  return (
    <div className="two-col" data-testid="reviews-comment-resolution">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-3.5 py-2.5">
          <b className="text-[13px]">
            {groups.length} comment thread{groups.length === 1 ? "" : "s"} · {comments.length} open comment{comments.length === 1 ? "" : "s"}
          </b>
        </div>
        <div className="max-h-[620px] overflow-auto">
          {groups.map((group) => {
            const title = groupTitle(group, versionCache);
            const latest = group.comments.slice().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
            return (
              <button key={group.key} type="button" onClick={() => setSelectedKey(group.key)} className={`list-row items-start gap-2.5 !px-3.5 !py-3 text-left ${group.key === selected.key ? "active" : ""}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
                  <MessageSquare size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-0.5 flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-900">{title}</span>
                    <span className="muted ml-auto shrink-0 text-[10px]">{formatRelative(group.latestAt)}</span>
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {group.comments.length} comment{group.comments.length === 1 ? "" : "s"} · {group.targetType.replaceAll("_", " ")}
                  </span>
                  {latest && <span className="mt-0.5 block truncate text-[11px] text-slate-600">{latest.body}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <ThreadDetail group={selected} title={groupTitle(selected, versionCache)} />
    </div>
  );
}

function groupTitle(group: ThreadGroup, versionCache: Record<string, VersionCacheEntry>) {
  if (group.targetType === "content_unit_version") {
    const entry = versionCache[group.targetId];
    if (entry?.status === "ready" && entry.data.summary) return entry.data.summary;
  }
  return `${group.targetType.replaceAll("_", " ")} ${group.targetId.slice(0, 8)}`;
}

function ThreadDetail({ group, title }: { group: ThreadGroup; title: string }) {
  const [body, setBody] = useState("");
  const [comments, setComments] = useState(group.comments);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setComments(group.comments);
    setBody("");
    setSubmitError(null);
  }, [group]);

  async function submitReply() {
    if (!body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await boxbrainApi.createComment({ kind: "review_comment", targetType: group.targetType, targetId: group.targetId, body: body.trim() });
      setComments((previous) => [...previous, created]);
      setBody("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Reply could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <b className="text-sm font-bold">{title}</b>
        <Tag tone="neutral">{group.targetType.replaceAll("_", " ")}</Tag>
      </div>
      <div className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-500">
        There is no &ldquo;mark resolved&rdquo; action in the API yet for comments — this thread stays open until that governance action is added.
      </div>
      <div className="grid gap-2.5">
        {comments
          .slice()
          .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
          .map((comment) => (
            <div key={comment.id} className="border-b border-dashed border-slate-200 pb-2.5 last:border-0">
              <div className="mb-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{formatDateTime(comment.createdAt)}</span>
                <Tag size="sm">{comment.status}</Tag>
              </div>
              <div className="text-sm text-slate-700">{comment.body}</div>
            </div>
          ))}
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 p-2.5">
        <textarea className="min-h-16 w-full resize-y rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-300" placeholder="Reply to this thread…" value={body} onChange={(event) => setBody(event.target.value)} />
        {submitError && <p className="m-0 mt-1 text-xs text-red-600">{submitError}</p>}
        <div className="mt-1.5 flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" disabled={submitting || !body.trim()} onClick={() => void submitReply()}>
            {submitting ? "Posting…" : "Reply"}
          </button>
        </div>
      </div>
    </Card>
  );
}
