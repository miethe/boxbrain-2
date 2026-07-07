import type { ReviewActionKind } from "@/lib/api";
import type { QueueDefinition, SuggestedActionButton } from "./types";

/**
 * Design (routes_reviews_v2.jsx RouteReviewsV2) renders 7 fixed queue tabs. The live API only
 * groups review items by whatever free-form `queueType` string a candidate was created with, and
 * two schema-naming generations exist in this codebase ("variant" vs "variant_candidate", etc.), so
 * each definition below accepts every known synonym. "New Items" and "Comment Resolution" have no
 * dedicated backend queue type at all (see audit-digest.md ## reviews, API[no] / API[partial]) and
 * are rendered with an honest, explained state instead of fabricated counts.
 */
export const QUEUE_DEFINITIONS: QueueDefinition[] = [
  { id: "all", label: "All Open Reviews", apiQueueTypes: [], support: "full" },
  {
    id: "new_items",
    label: "New Items",
    apiQueueTypes: [],
    support: "none",
    hint: "No backend queue type exists yet for newly ingested content awaiting first review."
  },
  { id: "duplicate", label: "Duplicate Candidates", apiQueueTypes: ["duplicate", "duplicate_candidate"], support: "full" },
  { id: "variant", label: "Variant Linking", apiQueueTypes: ["variant", "variant_candidate", "variant_linking"], support: "full" },
  { id: "similarity", label: "Similarity Review", apiQueueTypes: ["similarity", "similarity_candidate"], support: "full" },
  { id: "stale", label: "Stale Content", apiQueueTypes: ["stale", "stale_candidate"], support: "full" },
  { id: "approval", label: "Approvals", apiQueueTypes: ["approval", "approval_candidate"], support: "full" },
  {
    id: "comment_resolution",
    label: "Comment Resolution",
    apiQueueTypes: [],
    support: "partial",
    hint: "Backed by open comments from GET /api/comments — there is no dedicated review-queue type or resolve action in the API yet."
  }
];

export const ACTION_LABELS: Record<ReviewActionKind, string> = {
  accept: "Accept recommendation",
  "mark-variant": "Accept as variant",
  "mark-similar": "Accept as similar only",
  "merge-versions": "Accept merge",
  "set-canonical": "Accept canonical",
  approve: "Approve item",
  reject: "Reject candidate",
  "request-changes": "Request changes"
};

/** The 5 fixed governance buttons the design always shows for a 2-target (compare-style) review. */
export const COMPARE_SUGGESTED_ACTIONS: SuggestedActionButton[] = [
  { action: "mark-variant", label: "Mark as Variants", sub: "Link as variants", tone: "primary" },
  { action: "mark-similar", label: "Mark as Similar", sub: "Track similarity", tone: "default" },
  { action: "merge-versions", label: "Merge Versions", sub: "Combine into single", tone: "default" },
  { action: "set-canonical", label: "Set Canonical", sub: "Choose primary version", tone: "default" },
  { action: "reject", label: "Not Duplicates", sub: "Different content", tone: "danger" }
];

export const QUEUE_TYPE_LABELS: Record<string, string> = {
  duplicate: "Duplicate candidates",
  duplicate_candidate: "Duplicate candidates",
  variant: "Variant links",
  variant_candidate: "Variant links",
  variant_linking: "Variant links",
  similarity: "Similarity edges",
  similarity_candidate: "Similarity edges",
  stale: "Stale content",
  stale_candidate: "Stale content",
  approval: "Approvals",
  approval_candidate: "Approvals"
};
