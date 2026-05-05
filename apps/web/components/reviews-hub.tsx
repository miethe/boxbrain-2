"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GitBranch,
  GitCompareArrows,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle
} from "lucide-react";
import { Button, Card, EmptyState, Meter, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import {
  API_BASE_URL,
  ApiError,
  boxbrainApi,
  normalizeReviewAction,
  type GeneratedReviewCandidate,
  type ReviewActionKind,
  type ReviewCompareObject,
  type ReviewItem,
  type ReviewItemDetail,
  type ReviewQueueSummary,
  type ReviewTargetRef
} from "@/lib/api";

type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "restricted";
type ActionState = "idle" | "loading" | "success" | "error";

const queueLabels: Record<string, string> = {
  duplicate: "Duplicate candidates",
  duplicate_candidate: "Duplicate candidates",
  variant: "Variant links",
  variant_candidate: "Variant links",
  similarity: "Similarity edges",
  similarity_candidate: "Similarity edges",
  stale: "Stale content",
  stale_content: "Stale content",
  approval: "Approvals"
};

const actionLabels: Record<ReviewActionKind, string> = {
  accept: "Accept recommendation",
  "mark-variant": "Accept as variant",
  "mark-similar": "Accept as similar only",
  "merge-versions": "Accept merge",
  "set-canonical": "Accept canonical",
  approve: "Approve item",
  reject: "Reject candidate",
  "request-changes": "Request changes"
};

export function ReviewsHub() {
  const [queues, setQueues] = useState<ReviewQueueSummary[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selectedQueue, setSelectedQueue] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewItemDetail | null>(null);
  const [generatedCandidates, setGeneratedCandidates] = useState<GeneratedReviewCandidate[]>([]);
  const [queuesState, setQueuesState] = useState<LoadState>("idle");
  const [itemsState, setItemsState] = useState<LoadState>("idle");
  const [detailState, setDetailState] = useState<LoadState>("idle");
  const [generationState, setGenerationState] = useState<LoadState>("idle");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("Reviewer decision from Reviews Hub.");

  const selectedQueueOpenCount = useMemo(() => {
    if (selectedQueue === "all") return queues.reduce((total, queue) => total + queue.openCount, 0);
    return queues.find((queue) => queue.queueType === selectedQueue)?.openCount ?? items.length;
  }, [items.length, queues, selectedQueue]);

  const loadDetail = useCallback(async (reviewItemId: string) => {
    setSelectedItemId(reviewItemId);
    setDetailState("loading");
    setActionMessage(null);
    try {
      const nextDetail = await boxbrainApi.getReviewItem(reviewItemId);
      setDetail(nextDetail);
      setDetailState("ready");
    } catch (error) {
      setDetail(null);
      if (isRestrictedError(error)) {
        setDetailState("restricted");
        return;
      }
      setDetailState("error");
      setErrorMessage(error instanceof Error ? error.message : "Review detail could not be loaded.");
    }
  }, []);

  const loadItems = useCallback(
    async (queueType = selectedQueue) => {
      setItemsState("loading");
      setActionMessage(null);
      try {
        const response = await boxbrainApi.listReviewItems({
          queueType: queueType === "all" ? undefined : queueType,
          status: "open",
          limit: 25
        });
        setItems(response.items);
        if (response.items.length === 0) {
          setSelectedItemId(null);
          setDetail(null);
          setDetailState("empty");
          setItemsState("empty");
          return;
        }
        setItemsState("ready");
        await loadDetail(response.items[0].id);
      } catch (error) {
        setItems([]);
        setDetail(null);
        if (isRestrictedError(error)) {
          setItemsState("restricted");
          setDetailState("restricted");
          return;
        }
        setItemsState("error");
        setDetailState("error");
        setErrorMessage(error instanceof Error ? error.message : "Review queue could not be loaded.");
      }
    },
    [loadDetail, selectedQueue]
  );

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
      setErrorMessage(error instanceof Error ? error.message : "Review queue summaries could not be loaded.");
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadQueues(), loadItems(selectedQueue)]);
  }, [loadItems, loadQueues, selectedQueue]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function selectQueue(queueType: string) {
    setSelectedQueue(queueType);
    setGeneratedCandidates([]);
    await loadItems(queueType);
  }

  async function generateCandidates() {
    setGenerationState("loading");
    setActionMessage(null);
    try {
      const candidates = await boxbrainApi.generateReviewCandidates({
        queueType: selectedQueue === "all" ? undefined : selectedQueue,
        limit: 8
      });
      setGeneratedCandidates(candidates);
      setGenerationState(candidates.length ? "ready" : "empty");
    } catch (error) {
      setGeneratedCandidates([]);
      if (isRestrictedError(error)) {
        setGenerationState("restricted");
        return;
      }
      setGenerationState("error");
      setErrorMessage(error instanceof Error ? error.message : "Candidate generation could not be completed.");
    }
  }

  async function submitAction(action: ReviewActionKind) {
    if (!detail || detail.status !== "open") return;
    setActionState("loading");
    setActionMessage(null);
    try {
      await boxbrainApi.runReviewAction(detail.id, action, { reason });
      setActionState("success");
      setActionMessage(`${actionLabels[action]} recorded with audit metadata.`);
      await Promise.all([loadQueues(), loadItems(selectedQueue)]);
    } catch (error) {
      setActionState("error");
      if (isRestrictedError(error)) {
        setActionMessage("Reviewer permissions are required for this governance action.");
        return;
      }
      setActionMessage(error instanceof Error ? error.message : "The governance action failed.");
    }
  }

  return (
    <div className="route-body" data-testid="reviews-page">
      <PageHeader
        eyebrow="Reviews and governance"
        title="Review AI suggestions before graph changes"
        description="API-backed duplicate, variant, similarity, stale, and approval queues with auditable reviewer controls."
        actions={
          <>
            <Button onClick={refresh}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="primary" onClick={generateCandidates} disabled={generationState === "loading"}>
              <Sparkles size={14} /> {generationState === "loading" ? "Scanning" : "Generate candidates"}
            </Button>
          </>
        }
      />

      <div className="three-col">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-sm font-bold">Queues</h2>
            <StatusBadge tone={selectedQueueOpenCount > 0 ? "warn" : "ok"}>{selectedQueueOpenCount} open</StatusBadge>
          </div>
          <div className="mt-3 grid gap-2" data-testid="reviews-queue-list">
            <QueueButton active={selectedQueue === "all"} label="All open reviews" count={queues.reduce((total, queue) => total + queue.openCount, 0)} onClick={() => void selectQueue("all")} />
            {queues.map((queue) => (
              <QueueButton
                key={queue.queueType}
                active={selectedQueue === queue.queueType}
                label={queueLabel(queue.queueType)}
                count={queue.openCount}
                oldestCreatedAt={queue.oldestCreatedAt}
                onClick={() => void selectQueue(queue.queueType)}
              />
            ))}
          </div>
          {queuesState === "loading" && <p className="mt-3 text-sm text-slate-500">Loading queue summaries...</p>}
          {queuesState === "empty" && <p className="mt-3 text-sm text-slate-500">No open review queue summaries are currently returned by the API.</p>}
          {queuesState === "error" && <InlineAlert tone="danger" message={errorMessage ?? "Queue summaries failed."} />}
          {queuesState === "restricted" && <RestrictedCopy compact />}
        </Card>

        <div className="grid content-start gap-3" data-testid="reviews-item-list">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-sm font-bold">{selectedQueue === "all" ? "Open review items" : queueLabel(selectedQueue)}</h2>
                <p className="m-0 mt-1 text-xs text-slate-500">Live data from `/api/reviews/items` filtered to open items.</p>
              </div>
              <Tag tone="ai">AI suggestions remain candidates</Tag>
            </div>
          </Card>

          {itemsState === "loading" && <LoadingCard title="Loading review items" body="Fetching queue records and the first compare detail." />}
          {itemsState === "restricted" && <RestrictedCopy />}
          {itemsState === "error" && <ErrorState message={errorMessage ?? "Review items failed to load."} />}
          {itemsState === "empty" && <EmptyState title="No open review items" body="This queue has no open items. Generate candidates to run a non-persisted search scan, or switch queues." />}
          {itemsState === "ready" &&
            items.map((item) => (
              <ReviewItemCard key={item.id} item={item} active={item.id === selectedItemId} onClick={() => void loadDetail(item.id)} />
            ))}

          <GeneratedCandidates state={generationState} candidates={generatedCandidates} />
        </div>

        <DecisionPanel
          detail={detail}
          state={detailState}
          actionState={actionState}
          actionMessage={actionMessage}
          errorMessage={errorMessage}
          reason={reason}
          onReasonChange={setReason}
          onAction={(action) => void submitAction(action)}
        />
      </div>
    </div>
  );
}

function QueueButton({
  active,
  label,
  count,
  oldestCreatedAt,
  onClick
}: {
  active: boolean;
  label: string;
  count: number;
  oldestCreatedAt?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-14 cursor-pointer items-center justify-between rounded-lg border p-3 text-left text-sm ${
        active ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      <span>
        <span className="block font-bold">{label}</span>
        {oldestCreatedAt && <span className="block text-xs text-slate-500">Oldest {formatDate(oldestCreatedAt)}</span>}
      </span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{count}</span>
    </button>
  );
}

function ReviewItemCard({ item, active, onClick }: { item: ReviewItem; active: boolean; onClick: () => void }) {
  const confidence = confidencePercent(item.confidence);
  return (
    <Card className={`cursor-pointer p-4 transition hover:border-blue-200 hover:bg-blue-50/30 ${active ? "border-blue-300" : ""}`}>
      <button className="block w-full cursor-pointer text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold">{reviewTitle(item)}</div>
            <div className="mt-1 text-xs text-slate-500">{targetSummary(item.targetRefs)}</div>
          </div>
          <StatusBadge tone={confidence >= 85 ? "danger" : "warn"}>{confidence}%</StatusBadge>
        </div>
        <p className="mt-3 text-sm text-slate-600">{item.rationale || "No rationale was provided by the candidate source."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag tone="ai">{queueLabel(item.queueType)}</Tag>
          <Tag>{item.source}</Tag>
          <Tag>{formatDate(item.createdAt)}</Tag>
        </div>
      </button>
    </Card>
  );
}

function DecisionPanel({
  detail,
  state,
  actionState,
  actionMessage,
  errorMessage,
  reason,
  onReasonChange,
  onAction
}: {
  detail: ReviewItemDetail | null;
  state: LoadState;
  actionState: ActionState;
  actionMessage: string | null;
  errorMessage: string | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onAction: (action: ReviewActionKind) => void;
}) {
  if (state === "loading") return <LoadingCard title="Loading compare panel" body="Fetching review item detail and audit preview." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message={errorMessage ?? "Review item detail failed to load."} />;
  if (state === "empty" || !detail) return <EmptyState title="No review selected" body="Select an open review item to compare targets and record a decision." />;

  const suggestedAction = normalizeReviewAction(detail.suggestedAction);
  const canAct = detail.status === "open";
  const requiresRole = typeof detail.auditPreview.requiresRole === "string" ? detail.auditPreview.requiresRole : "reviewer";
  const compareObjects = detail.compareObjects.length ? detail.compareObjects : detail.targetRefs.map(targetRefToCompareObject);

  return (
    <div data-testid="reviews-decision-panel">
      <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} color="var(--ok)" /> Decision panel
        </div>
        <StatusBadge tone={canAct ? "warn" : "ok"}>{detail.status}</StatusBadge>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Tag tone="ai">{queueLabel(detail.queueType)}</Tag>
        <Tag>{detail.source}</Tag>
        <Tag>{actionLabels[suggestedAction]}</Tag>
      </div>

      <ComparePanel objects={compareObjects} />

      <div className="mt-4 rounded-lg bg-violet-50 p-3 text-sm text-violet-950">
        AI rationale remains attached to this review record. Accepting, rejecting, or requesting changes calls a governance action endpoint and expects the backend to write audit metadata.
      </div>

      <div className="mt-4">
        <Meter value={confidencePercent(detail.confidence)} label="suggestion confidence" />
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
        Decision reason
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm normal-case tracking-normal text-slate-700 outline-none focus:border-blue-300"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </label>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <Lock size={13} className="mr-1 inline" /> Action requires `{requiresRole}` access. Restricted targets suppress preview and snippet content.
      </div>

      {actionMessage && <InlineAlert tone={actionState === "error" ? "danger" : "ok"} message={actionMessage} />}

      <div className="mt-4 grid gap-2">
        <Button variant="primary" disabled={!canAct || actionState === "loading"} onClick={() => onAction(suggestedAction)}>
          <CheckCircle2 size={14} /> {actionState === "loading" ? "Recording" : actionLabels[suggestedAction]}
        </Button>
        <Button disabled={!canAct || actionState === "loading"} onClick={() => onAction("reject")}>
          <XCircle size={14} /> Reject candidate
        </Button>
        <Button disabled={!canAct || actionState === "loading"} onClick={() => onAction("request-changes")}>
          <GitBranch size={14} /> Request changes
        </Button>
      </div>
      </Card>
    </div>
  );
}

function ComparePanel({ objects }: { objects: ReviewCompareObject[] }) {
  if (objects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No compare objects were returned for this review detail.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
        <GitCompareArrows size={14} /> Compare
      </div>
      <div className="grid grid-cols-2 gap-3">
        {objects.slice(0, 2).map((object, index) => (
          <CompareObjectCard key={`${object.versionId ?? object.id ?? object.title ?? "object"}-${index}`} object={object} index={index} />
        ))}
      </div>
    </div>
  );
}

function CompareObjectCard({ object, index }: { object: ReviewCompareObject; index: number }) {
  const title = object.title ?? `Review target ${index + 1}`;
  const previewUri = object.previewUri ?? object.thumbnailUri ?? object.renderUri;
  const restricted = Boolean(object.isRestricted || object.statusChips?.isRestricted);
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      {restricted ? (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
          <ShieldAlert size={18} />
          Restricted preview hidden
        </div>
      ) : previewUri ? (
        <RenderedPreview uri={previewUri} title={title} />
      ) : (
        <SlideThumb title={title} variant={index % 2 === 0 ? "light" : "teal"} brand="BB" />
      )}
      <div className="mt-2 text-xs font-bold">{title}</div>
      {object.summary && !restricted && <p className="m-0 mt-1 line-clamp-3 text-xs text-slate-500">{object.summary}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {object.statusChips?.approvalState && <StatusBadge tone={object.statusChips.approvalState === "approved" ? "ok" : "warn"}>{object.statusChips.approvalState}</StatusBadge>}
        {object.statusChips?.freshnessState && <Tag>{object.statusChips.freshnessState}</Tag>}
      </div>
    </div>
  );
}

function GeneratedCandidates({ state, candidates }: { state: LoadState; candidates: GeneratedReviewCandidate[] }) {
  if (state === "idle") return null;
  if (state === "loading") return <LoadingCard title="Generating candidates" body="Running a compatible backend candidate request or search-based fallback scan." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message="Candidate generation failed." />;
  if (state === "empty") return <EmptyState title="No generated candidates" body="The fallback scan did not return enough unrestricted results to form candidate pairs." />;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-bold">Generated candidate scan</h2>
        <Tag tone="ai">not persisted</Tag>
      </div>
      <div className="mt-3 grid gap-3">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{candidate.title}</div>
                <p className="m-0 mt-1 text-xs text-slate-500">{candidate.rationale}</p>
              </div>
              <StatusBadge tone="ai">{confidencePercent(candidate.confidence)}%</StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Tag>{queueLabel(candidate.queueType)}</Tag>
              <Tag>{candidate.source}</Tag>
              {candidate.suggestedAction && <Tag>{actionLabels[candidate.suggestedAction]}</Tag>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LoadingCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <RefreshCw size={16} className="mt-0.5 animate-spin text-blue-600" />
        <div>
          <div className="text-sm font-bold text-slate-800">{title}</div>
          <p className="m-0 mt-1 text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 text-red-700">
        <AlertCircle size={16} className="mt-0.5" />
        <div>
          <div className="text-sm font-bold">Reviews API unavailable</div>
          <p className="m-0 mt-1 text-sm text-red-700">{message}</p>
        </div>
      </div>
    </Card>
  );
}

function RestrictedCopy({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "mt-3 p-3" : "p-5"}>
      <div className="flex items-start gap-3 text-slate-700">
        <ShieldAlert size={16} className="mt-0.5 text-amber-600" />
        <div>
          <div className="text-sm font-bold">Reviewer access required</div>
          <p className="m-0 mt-1 text-sm text-slate-500">
            This user cannot view review queues, previews, snippets, or action metadata for restricted content.
          </p>
        </div>
      </div>
    </Card>
  );
}

function InlineAlert({ tone, message }: { tone: "ok" | "danger"; message: string }) {
  return (
    <div className={`mt-3 rounded-lg border p-3 text-sm ${tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
      {message}
    </div>
  );
}

function RenderedPreview({ uri, title }: { uri: string; title: string }) {
  return (
    <div
      className="aspect-video rounded-lg border border-slate-200 bg-cover bg-center"
      aria-label={`${title} preview`}
      style={{
        backgroundImage: `url("${assetUrl(uri)}")`
      }}
    />
  );
}

function isRestrictedError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function assetUrl(uri: string) {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE_URL}${uri}`;
}

function confidencePercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}

function queueLabel(queueType: string) {
  return queueLabels[queueType] ?? queueType.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function reviewTitle(item: ReviewItem) {
  const action = normalizeReviewAction(item.suggestedAction);
  return `${actionLabels[action]} review`;
}

function targetSummary(targetRefs: ReviewTargetRef[]) {
  if (targetRefs.length === 0) return "No targets returned";
  return targetRefs.map((target, index) => target.title ?? target.id ?? target.versionId ?? `Target ${index + 1}`).join(" vs ");
}

function targetRefToCompareObject(target: ReviewTargetRef): ReviewCompareObject {
  return {
    title: target.title ?? target.id ?? target.versionId ?? "Review target",
    versionId: target.versionId ?? target.id,
    familyId: target.familyId,
    variantId: target.variantId,
    isRestricted: target.isRestricted
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
