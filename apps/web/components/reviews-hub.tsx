"use client";

import { Download, RefreshCw, Settings, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import {
  ApiError,
  boxbrainApi,
  type Comment,
  type GeneratedReviewCandidate,
  type ReviewActionKind,
  type ReviewItem,
  type ReviewItemDetail,
  type ReviewQueueSummary
} from "@/lib/api";
import { CommentResolutionPanel } from "@/components/reviews/comment-resolution-panel";
import { CompareDrawer } from "@/components/reviews/compare-drawer";
import { CompareWorkspace } from "@/components/reviews/compare-workspace";
import { DecisionRail } from "@/components/reviews/decision-rail";
import { GeneratedCandidates } from "@/components/reviews/generated-candidates";
import { ReviewItemListPanel } from "@/components/reviews/item-list";
import { ReviewQueueTabs } from "@/components/reviews/queue-tabs";
import { InlineAlert, RestrictedCopy } from "@/components/reviews/shared";
import { ACTION_LABELS, QUEUE_DEFINITIONS } from "@/features/reviews/constants";
import { downloadReviewItemsCsv } from "@/features/reviews/export";
import { buildEnrichedTargets, targetRefToCompareObject } from "@/features/reviews/enrich";
import { matchesQueueDefinition } from "@/features/reviews/format";
import type { ActionState, LoadState } from "@/features/reviews/types";
import { useVersionCache } from "@/features/reviews/use-version-cache";

export function ReviewsHub() {
  const [queues, setQueues] = useState<ReviewQueueSummary[]>([]);
  const [queuesState, setQueuesState] = useState<LoadState>("idle");
  const [allItems, setAllItems] = useState<ReviewItem[]>([]);
  const [itemsState, setItemsState] = useState<LoadState>("idle");
  const [selectedQueueId, setSelectedQueueId] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewItemDetail | null>(null);
  const [detailState, setDetailState] = useState<LoadState>("idle");
  const [generatedCandidates, setGeneratedCandidates] = useState<GeneratedReviewCandidate[]>([]);
  const [generationState, setGenerationState] = useState<LoadState>("idle");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("Reviewer decision from Reviews Hub.");
  const [manualOverride, setManualOverride] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsState, setCommentsState] = useState<LoadState>("idle");

  const { entries: versionCache, ensure: ensureVersion, reset: resetVersionCache } = useVersionCache();

  const activeDefinition = useMemo(() => QUEUE_DEFINITIONS.find((definition) => definition.id === selectedQueueId) ?? QUEUE_DEFINITIONS[0], [selectedQueueId]);

  const bucketItems = useMemo(() => allItems.filter((item) => matchesQueueDefinition(item, activeDefinition)), [allItems, activeDefinition]);

  const queueOpenTotal = useMemo(() => {
    if (activeDefinition.id === "all") return queues.reduce((total, queue) => total + queue.openCount, 0);
    const matched = queues.filter((queue) => activeDefinition.apiQueueTypes.includes(queue.queueType)).reduce((total, queue) => total + queue.openCount, 0);
    return matched || bucketItems.length;
  }, [queues, activeDefinition, bucketItems.length]);

  const enrichedTargets = useMemo(() => {
    if (!detail) return [];
    const compareObjects = detail.compareObjects.length ? detail.compareObjects : detail.targetRefs.map(targetRefToCompareObject);
    return buildEnrichedTargets(compareObjects, versionCache);
  }, [detail, versionCache]);

  const loadDetail = useCallback(
    async (reviewItemId: string) => {
      setSelectedItemId(reviewItemId);
      setDetailState("loading");
      setActionMessage(null);
      setManualOverride(false);
      try {
        const nextDetail = await boxbrainApi.getReviewItem(reviewItemId);
        setDetail(nextDetail);
        setDetailState("ready");
        const compareObjects = nextDetail.compareObjects.length ? nextDetail.compareObjects : nextDetail.targetRefs.map(targetRefToCompareObject);
        for (const object of compareObjects) ensureVersion(object.versionId);
      } catch (error) {
        setDetail(null);
        if (isRestrictedError(error)) {
          setDetailState("restricted");
          return;
        }
        setDetailState("error");
        setErrorMessage(errorText(error, "Review detail could not be loaded."));
      }
    },
    [ensureVersion]
  );

  const loadItems = useCallback(async () => {
    setItemsState("loading");
    setActionMessage(null);
    try {
      // Fetched once, unscoped: seed/generated review items use two different queueType naming
      // generations for the same conceptual queue (e.g. "variant" vs "variant_candidate"), so
      // bucketing happens client-side against QUEUE_DEFINITIONS instead of re-querying per tab.
      const response = await boxbrainApi.listReviewItems({ status: "open", limit: 200 });
      setAllItems(response.items);
      setItemsState(response.items.length ? "ready" : "empty");
    } catch (error) {
      setAllItems([]);
      if (isRestrictedError(error)) {
        setItemsState("restricted");
        setDetailState("restricted");
        return;
      }
      setItemsState("error");
      setDetailState("error");
      setErrorMessage(errorText(error, "Review queue could not be loaded."));
    }
  }, []);

  const loadQueues = useCallback(async () => {
    setQueuesState("loading");
    try {
      const nextQueues = await boxbrainApi.listReviewQueues();
      setQueues(nextQueues);
      setQueuesState(nextQueues.length ? "ready" : "empty");
    } catch (error) {
      setQueues([]);
      if (isRestrictedError(error)) {
        setQueuesState("restricted");
        return;
      }
      setQueuesState("error");
      setErrorMessage(errorText(error, "Review queue summaries could not be loaded."));
    }
  }, []);

  const loadComments = useCallback(async () => {
    setCommentsState("loading");
    try {
      const items = await boxbrainApi.listComments();
      const open = items.filter((comment) => comment.status === "open");
      setComments(open);
      setCommentsState(open.length ? "ready" : "empty");
    } catch (error) {
      setComments([]);
      if (isRestrictedError(error)) {
        setCommentsState("restricted");
        return;
      }
      setCommentsState("error");
    }
  }, []);

  const refresh = useCallback(async () => {
    resetVersionCache();
    await Promise.all([loadQueues(), loadItems(), loadComments()]);
  }, [loadQueues, loadItems, loadComments, resetVersionCache]);

  useEffect(() => {
    void refresh();
    // Intentionally runs once on mount; `refresh` recreates identity when its callback deps
    // change but should not re-trigger the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select the first item in whichever queue bucket is active, mirroring the previous
  // sidebar behavior, without re-fetching the whole item list per tab click.
  useEffect(() => {
    if (selectedQueueId === "new_items" || selectedQueueId === "comment_resolution") return;
    if (itemsState !== "ready" && itemsState !== "empty") return;
    if (bucketItems.length === 0) {
      setSelectedItemId(null);
      setDetail(null);
      setDetailState("empty");
      return;
    }
    if (!bucketItems.some((item) => item.id === selectedItemId)) {
      void loadDetail(bucketItems[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketItems, itemsState, selectedQueueId]);

  function selectQueue(id: string) {
    setSelectedQueueId(id);
    setGeneratedCandidates([]);
    setGenerationState("idle");
  }

  async function generateCandidates() {
    setGenerationState("loading");
    setActionMessage(null);
    try {
      const candidates = await boxbrainApi.generateReviewCandidates({
        queueType: activeDefinition.apiQueueTypes[0],
        limit: 8
      });
      setGeneratedCandidates(candidates);
      setGenerationState(candidates.length ? "ready" : "empty");
      await Promise.all([loadQueues(), loadItems()]);
    } catch (error) {
      setGeneratedCandidates([]);
      if (isRestrictedError(error)) {
        setGenerationState("restricted");
        return;
      }
      setGenerationState("error");
      setErrorMessage(errorText(error, "Candidate generation could not be completed."));
    }
  }

  async function submitAction(action: ReviewActionKind) {
    if (!detail || detail.status !== "open") return;
    setActionState("loading");
    setActionMessage(null);
    try {
      await boxbrainApi.runReviewAction(detail.id, action, { reason });
      setActionState("success");
      setActionMessage(`${ACTION_LABELS[action]} recorded with audit metadata.`);
      await Promise.all([loadQueues(), loadItems()]);
    } catch (error) {
      setActionState("error");
      if (isRestrictedError(error)) {
        setActionMessage("Reviewer permissions are required for this governance action.");
        return;
      }
      setActionMessage(errorText(error, "The governance action failed."));
    }
  }

  function handleExport() {
    downloadReviewItemsCsv(bucketItems, `boxbrain-reviews-${activeDefinition.id}.csv`);
  }

  const exportDisabled = selectedQueueId === "new_items" || selectedQueueId === "comment_resolution" || bucketItems.length === 0;
  const commentCount = commentsState === "idle" || commentsState === "loading" ? null : comments.length;

  return (
    <div className="route-body" data-testid="reviews-page">
      <PageHeader
        eyebrow="Reviews and governance"
        title="Reviews"
        description="AI-powered review queues for content quality, deduplication, and governance."
        actions={
          <>
            <Button onClick={() => void refresh()}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => void generateCandidates()} disabled={generationState === "loading"}>
              <Sparkles size={14} /> {generationState === "loading" ? "Scanning" : "Generate candidates"}
            </Button>
            <Button onClick={handleExport} disabled={exportDisabled} title="Download the currently loaded items in this queue as CSV">
              <Download size={14} /> Export
            </Button>
            <Button disabled title="No queue-configuration endpoint exists in the API yet (audit-digest.md ## reviews).">
              <Settings size={14} /> Queue Settings
            </Button>
          </>
        }
      />

      <ReviewQueueTabs queues={queues} commentCount={commentCount} active={selectedQueueId} onChange={selectQueue} />

      {queuesState === "error" && <InlineAlert tone="danger" message={errorMessage ?? "Queue summaries failed."} />}
      {queuesState === "restricted" && <RestrictedCopy compact />}

      <div className="mt-4">
        {selectedQueueId === "new_items" ? (
          <EmptyState
            title="New Items queue is not tracked by the API yet"
            body={QUEUE_DEFINITIONS.find((definition) => definition.id === "new_items")?.hint ?? "No backend queue type exists for this yet."}
          />
        ) : selectedQueueId === "comment_resolution" ? (
          <CommentResolutionPanel comments={comments} state={commentsState} errorMessage={errorMessage} versionCache={versionCache} ensureVersion={ensureVersion} />
        ) : (
          <div className="three-col items-start">
            <div className="grid content-start gap-3">
              <ReviewItemListPanel
                items={bucketItems}
                state={itemsState}
                errorMessage={errorMessage}
                selectedItemId={selectedItemId}
                onSelect={(id) => void loadDetail(id)}
                totalOpenCount={queueOpenTotal}
                versionCache={versionCache}
                ensureVersion={ensureVersion}
              />
              <GeneratedCandidates state={generationState} candidates={generatedCandidates} />
            </div>

            <CompareWorkspace
              detail={detail}
              state={detailState}
              errorMessage={errorMessage}
              enrichedTargets={enrichedTargets}
              manualOverride={manualOverride}
              onToggleManualOverride={() => setManualOverride((value) => !value)}
              onOpenDrawer={() => setDrawerOpen(true)}
            />

            <DecisionRail
              detail={detail}
              state={detailState}
              errorMessage={errorMessage}
              enrichedTargets={enrichedTargets}
              actionState={actionState}
              actionMessage={actionMessage}
              reason={reason}
              onReasonChange={setReason}
              manualOverride={manualOverride}
              onAction={(action) => void submitAction(action)}
            />
          </div>
        )}
      </div>

      <CompareDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} targets={enrichedTargets} />
    </div>
  );
}

function isRestrictedError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
