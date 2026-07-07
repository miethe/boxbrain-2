// Shared types for the Reviews Hub (queues, compare workspace, decision rail, compare drawer).
// Design truth: docs/project_plans/init/boxbrain-v2-project-handoff/project/src_v2/routes_reviews_v2.jsx
// (RouteReviewsV2) and routes_4.jsx (RouteReviews / RouteCompare) plus uploads/reviews.png and
// uploads/slide-compare.png.

import type { Comment, ContentUnitVersionDetail, ReviewActionKind } from "@/lib/api";

export type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "restricted";
export type ActionState = "idle" | "loading" | "success" | "error";

/** How well a design-spec review queue is actually backed by the live API. */
export type QueueSupport = "full" | "partial" | "none";

export type QueueDefinition = {
  /** Stable id used for local UI state; not necessarily the raw API `queueType` string. */
  id: string;
  label: string;
  /** Raw `queueType` strings (across schema-naming variants) that map to this queue. */
  apiQueueTypes: string[];
  support: QueueSupport;
  /** Shown when support is "none" or "partial" so the gap is honest, not hidden. */
  hint?: string;
};

export type SortKey = "confidence" | "updated" | "title";

export type CompareTabId = "content" | "comments" | "provenance" | "version" | "activity";

/** Cache entry for a lazily-fetched ContentUnitVersionDetail keyed by versionId. */
export type VersionCacheEntry =
  | { status: "loading" }
  | { status: "ready"; data: ContentUnitVersionDetail }
  | { status: "restricted" }
  | { status: "error"; message: string };

/** One side of a review comparison, enriched with whatever the version-detail cache has loaded. */
export type EnrichedTarget = {
  index: number;
  title: string;
  versionId?: string;
  variantId?: string;
  subtitle?: string;
  renderUri?: string | null;
  thumbnailUri?: string | null;
  summary?: string | null;
  extractedText?: string | null;
  approvalState?: string;
  freshnessState?: string;
  qualityScore?: number | null;
  usageScore?: number | null;
  createdAt?: string;
  versionNumber?: string;
  isRestricted?: boolean;
  provenance?: ContentUnitVersionDetail["provenance"];
  cacheStatus: "idle" | "loading" | "ready" | "restricted" | "error";
};

/** A comment thread grouped by target for the Comment Resolution pseudo-queue. */
export type CommentThreadGroup = {
  targetType: string;
  targetId: string;
  title: string;
  comments: Comment[];
  latestAt: string;
  cacheStatus: "loading" | "ready" | "restricted" | "error";
};

export type SuggestedActionButton = {
  action: ReviewActionKind;
  label: string;
  sub: string;
  tone: "primary" | "default" | "danger";
};
