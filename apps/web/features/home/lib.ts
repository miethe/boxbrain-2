import type { ContentUnitFamilyCard, IngestionJob, ReviewItem, ReviewQueueSummary } from "@/lib/api";

/**
 * Home dashboard helpers. Every function here operates on live API payloads
 * (ContentUnitFamilyCard / ReviewQueueSummary / ReviewItem / IngestionJob) — nothing here
 * fabricates numbers. Callers pass an `available` flag per data source so degraded
 * (restricted/error) sources are simply omitted rather than backfilled with fake data.
 */

export function greetingForHour(hour: number) {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatBriefingDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatQueueLabel(queueType: string) {
  const cleaned = queueType.replace(/_candidate$/, "").replaceAll("_", " ");
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function truncate(value: string, max = 100) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export type IngestionSummary = {
  total: number;
  queued: number;
  running: number;
  failed: number;
  complete: number;
};

export function summarizeIngestionJobs(jobs: IngestionJob[]): IngestionSummary {
  const summary: IngestionSummary = { total: jobs.length, queued: 0, running: 0, failed: 0, complete: 0 };
  for (const job of jobs) {
    if (job.status === "queued") summary.queued += 1;
    else if (job.status === "running") summary.running += 1;
    else if (job.status === "failed") summary.failed += 1;
    else if (job.status === "complete") summary.complete += 1;
  }
  return summary;
}

export type FamilyBreakdown = {
  total: number;
  approved: number;
  stale: number;
  restricted: number;
};

export function familyBreakdown(families: ContentUnitFamilyCard[]): FamilyBreakdown {
  let approved = 0;
  let stale = 0;
  let restricted = 0;
  for (const family of families) {
    if (family.statusChips?.approvalState === "approved") approved += 1;
    if (family.statusChips?.freshnessState === "stale") stale += 1;
    if (family.statusChips?.isRestricted) restricted += 1;
  }
  return { total: families.length, approved, stale, restricted };
}

export type AttentionTone = "danger" | "warn" | "ai" | "primary";
export type AttentionIconKey = "flag" | "clock" | "sparkle" | "shield";

export type AttentionItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone: AttentionTone;
  iconKey: AttentionIconKey;
};

export function buildAttentionFeed(input: {
  reviewsAvailable: boolean;
  reviewItems: ReviewItem[];
  ingestionAvailable: boolean;
  ingestionJobs: IngestionJob[];
  familiesAvailable: boolean;
  staleFamilyCount: number;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (input.reviewsAvailable) {
    for (const item of input.reviewItems.slice(0, 2)) {
      const confidencePct = typeof item.confidence === "number" ? Math.round(item.confidence * 100) : null;
      items.push({
        id: `review-${item.id}`,
        title: truncate(item.rationale ?? `${formatQueueLabel(item.queueType)} candidate awaiting review`),
        subtitle: `Review · ${formatQueueLabel(item.queueType)}${confidencePct !== null ? ` · ${confidencePct}% confidence` : ""}`,
        href: "/reviews",
        tone: confidencePct !== null && confidencePct >= 90 ? "danger" : "warn",
        iconKey: "flag"
      });
    }
  }

  if (input.ingestionAvailable) {
    const failed = input.ingestionJobs.filter((job) => job.status === "failed");
    if (failed.length > 0) {
      const job = failed[0];
      items.push({
        id: `ingestion-${job.id}`,
        title: `${failed.length} ingestion job${failed.length === 1 ? "" : "s"} failed and may need a retry`,
        subtitle: `Ingestion · ${job.title ?? job.artifactType} · ${job.stage}`,
        href: "/ingestion",
        tone: "danger",
        iconKey: "clock"
      });
    } else {
      const active = input.ingestionJobs.find((job) => job.status === "running" || job.status === "queued");
      if (active) {
        items.push({
          id: `ingestion-${active.id}`,
          title: `${active.title ?? "An ingestion job"} is ${active.status} at the ${active.stage} stage`,
          subtitle: "Ingestion · in progress",
          href: "/ingestion",
          tone: "primary",
          iconKey: "clock"
        });
      }
    }
  }

  if (input.familiesAvailable && input.staleFamilyCount > 0) {
    items.push({
      id: "families-stale",
      title: `${input.staleFamilyCount} content famil${input.staleFamilyCount === 1 ? "y is" : "ies are"} flagged stale`,
      subtitle: "Library health · refresh recommended",
      href: "/library",
      tone: "warn",
      iconKey: "shield"
    });
  }

  items.push({
    id: "plays-preview",
    title: "Explore multi-step expansion patterns in the Plays preview workspace",
    subtitle: "Play · preview module, not live data",
    href: "/plays",
    tone: "ai",
    iconKey: "sparkle"
  });

  return items.slice(0, 4);
}

export type AiSuggestion = {
  id: string;
  text: string;
  href: string;
};

export function buildAiSuggestions(input: {
  reviewsAvailable: boolean;
  queues: ReviewQueueSummary[];
  familiesAvailable: boolean;
  staleFamilyCount: number;
  restrictedFamilyCount: number;
}): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];

  if (input.reviewsAvailable && input.queues.length > 0) {
    const topQueue = [...input.queues].sort((left, right) => right.openCount - left.openCount)[0];
    if (topQueue.openCount > 0) {
      suggestions.push({
        id: "queue",
        text: `${topQueue.openCount} item${topQueue.openCount === 1 ? "" : "s"} ${topQueue.openCount === 1 ? "is" : "are"} waiting in the ${formatQueueLabel(topQueue.queueType)} queue.`,
        href: "/reviews"
      });
    }
  }

  if (input.familiesAvailable && input.staleFamilyCount > 0) {
    suggestions.push({
      id: "stale",
      text: `${input.staleFamilyCount} approved famil${input.staleFamilyCount === 1 ? "y" : "ies"} may need a freshness refresh before the next customer conversation.`,
      href: "/library"
    });
  }

  if (input.familiesAvailable && input.restrictedFamilyCount > 0) {
    suggestions.push({
      id: "restricted",
      text: `${input.restrictedFamilyCount} restricted famil${input.restrictedFamilyCount === 1 ? "y stays" : "ies stay"} hidden from standard search and Ask results.`,
      href: "/admin"
    });
  }

  suggestions.push({
    id: "plays-preview",
    text: "See how the Executive Expansion Play sequences a multi-step account expansion motion.",
    href: "/plays"
  });

  return suggestions.slice(0, 3);
}
