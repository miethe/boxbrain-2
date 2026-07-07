"use client";

import { useState } from "react";
import Link from "next/link";
import { CornerDownRight, MessageSquarePlus, Send } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { Comment } from "@/lib/api";
import { formatDate, groupCommentsIntoThreads } from "@/features/content-units/lib";

/** There is no author field on the Comment schema (see audit-digest.md), so every comment renders
 * with a generic "Team" avatar/label instead of a fabricated name. Timestamps are real. */
const UNKNOWN_AUTHOR = "Team";

export function CommentThread({
  comments,
  pageId,
  versionId,
  createCommentAction,
  limit,
  viewAllHref
}: {
  comments: Comment[];
  pageId: string;
  versionId: string;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  limit?: number;
  viewAllHref?: string;
}) {
  const threads = groupCommentsIntoThreads(comments);
  const visible = limit ? threads.slice(0, limit) : threads;
  const [replyTo, setReplyTo] = useState<string | null>(null);

  return (
    <div>
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-sm text-[var(--ink-3)]">No comments yet.</div>
      ) : (
        <div className="grid gap-1">
          {visible.map(({ root, replies }) => (
            <div key={root.id} className="border-b border-dashed border-[var(--line-soft)] py-2.5 last:border-b-0">
              <CommentRow comment={root} />
              {replies.map((reply) => (
                <div key={reply.id} className="ml-6 mt-2 flex items-start gap-1.5">
                  <CornerDownRight size={12} className="mt-1.5 shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
                  <CommentRow comment={reply} compact />
                </div>
              ))}
              {replyTo === root.id ? (
                <form
                  action={createCommentAction}
                  className="ml-6 mt-2 flex items-start gap-2"
                  onSubmit={() => setReplyTo(null)}
                >
                  <input type="hidden" name="pageId" value={pageId} />
                  <input type="hidden" name="versionId" value={versionId} />
                  <input type="hidden" name="parentCommentId" value={root.id} />
                  <Avatar who={UNKNOWN_AUTHOR} className="sm" />
                  <textarea
                    name="body"
                    required
                    rows={1}
                    autoFocus
                    className="min-h-8 flex-1 resize-none rounded-md border border-[var(--line)] px-2 py-1.5 text-xs"
                    placeholder={`Reply to ${UNKNOWN_AUTHOR}…`}
                  />
                  <button type="submit" className="icon-btn shrink-0" aria-label="Send reply">
                    <Send size={13} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button type="button" className="link ml-6 mt-1 text-[11px]" onClick={() => setReplyTo(root.id)}>
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {viewAllHref && comments.length > (limit ?? 0) && (
        <Link className="link mt-2 inline-block text-xs" href={viewAllHref}>
          View all ({comments.length})
        </Link>
      )}
      <form action={createCommentAction} className="mt-3 flex items-center gap-2 rounded-md bg-[var(--bg-2)] p-2">
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="versionId" value={versionId} />
        <Avatar who={UNKNOWN_AUTHOR} className="sm" />
        <input name="body" required className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[var(--ink-3)]" placeholder="Add a comment…" />
        <button type="submit" className="icon-btn borderless shrink-0" aria-label="Add comment">
          <MessageSquarePlus size={14} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function CommentRow({ comment, compact }: { comment: Comment; compact?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Avatar who={UNKNOWN_AUTHOR} className="sm" />
      <div className="min-w-0 flex-1 text-xs">
        <div className="flex items-center gap-2">
          <b className="text-[var(--ink)]">{UNKNOWN_AUTHOR}</b>
          <span className="muted text-[11px]">{formatDate(comment.createdAt)}</span>
          {!compact && comment.status !== "open" && <span className="muted text-[11px]">· {comment.status}</span>}
        </div>
        <div className="mt-0.5 text-[var(--ink-2)]">{comment.body}</div>
      </div>
    </div>
  );
}
