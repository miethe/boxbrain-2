import { Card } from "@/components/ui";
import type { Comment } from "@/lib/api";
import { CommentThread } from "./comment-thread";

export function CommentsTab({
  pageId,
  versionId,
  comments,
  createCommentAction
}: {
  pageId: string;
  versionId?: string;
  comments: Comment[];
  createCommentAction: (formData: FormData) => void | Promise<void>;
}) {
  if (!versionId) {
    return <div className="mt-5 rounded-lg border border-dashed border-[var(--line-2)] p-4 text-sm text-[var(--ink-3)]">No version is selected, so comments are unavailable.</div>;
  }
  return (
    <Card className="mt-5 p-4">
      <CommentThread comments={comments} pageId={pageId} versionId={versionId} createCommentAction={createCommentAction} />
    </Card>
  );
}
