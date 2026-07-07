"use client";

import { Tabs } from "@/components/ui";
import type { ReviewQueueSummary } from "@/lib/api";
import { QUEUE_DEFINITIONS } from "@/features/reviews/constants";

/**
 * Design (routes_reviews_v2.jsx RvTab / RouteReviewsV2) renders queues as a full-width horizontal
 * underline-tab strip, not the previous sidebar column. "New Items" and "Comment Resolution" have
 * no dedicated backend queue type (audit-digest.md ## reviews); selecting them still works, but the
 * workspace below renders an honest explanation instead of fabricated review items.
 */
export function ReviewQueueTabs({ queues, commentCount, active, onChange }: { queues: ReviewQueueSummary[]; commentCount: number | null; active: string; onChange: (id: string) => void }) {
  const tabs = QUEUE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    count: countFor(definition.id, queues, commentCount)
  }));

  return (
    <div className="overflow-x-auto" data-testid="reviews-queue-list">
      <Tabs tabs={tabs} active={active} onChange={onChange} />
    </div>
  );
}

function countFor(id: string, queues: ReviewQueueSummary[], commentCount: number | null): number | string {
  if (id === "new_items") return "—";
  if (id === "comment_resolution") return commentCount === null ? "…" : commentCount;
  const definition = QUEUE_DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) return 0;
  if (id === "all") return queues.reduce((total, queue) => total + queue.openCount, 0);
  return queues.filter((queue) => definition.apiQueueTypes.includes(queue.queueType)).reduce((total, queue) => total + queue.openCount, 0);
}
