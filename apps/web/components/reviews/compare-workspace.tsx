"use client";

import { ArrowLeftRight, ChevronDown, ChevronUp, Download, Eye, ExternalLink, MoreHorizontal, ShieldAlert, Sparkles } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Card, EmptyState, Tag } from "@/components/ui";
import { ApiError, boxbrainApi, type Comment, type ContentUnitVersion, type ReviewItemDetail } from "@/lib/api";
import { assetUrl, confidencePercent, formatDate, formatDateTime } from "@/features/reviews/format";
import type { CompareTabId, EnrichedTarget, LoadState } from "@/features/reviews/types";
import { ErrorState, LoadingCard, RestrictedCopy } from "./shared";

const COMPARE_TABS: Array<{ id: CompareTabId; label: string }> = [
  { id: "content", label: "Content Comparison" },
  { id: "comments", label: "Comments" },
  { id: "provenance", label: "Provenance" },
  { id: "version", label: "Version History" },
  { id: "activity", label: "Activity" }
];

export function CompareWorkspace({
  detail,
  state,
  errorMessage,
  enrichedTargets,
  manualOverride,
  onToggleManualOverride,
  onOpenDrawer
}: {
  detail: ReviewItemDetail | null;
  state: LoadState;
  errorMessage: string | null;
  enrichedTargets: EnrichedTarget[];
  manualOverride: boolean;
  onToggleManualOverride: () => void;
  onOpenDrawer: () => void;
}) {
  const [order, setOrder] = useState<number[]>([0, 1]);
  const [activeTab, setActiveTab] = useState<CompareTabId>("content");
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);

  useEffect(() => {
    setOrder(enrichedTargets.map((_, index) => index));
    setActiveTab("content");
    setAiDetailsOpen(false);
    // Intentionally reset only when the selected review or target count changes, not on every
    // enrichment cache update (which would otherwise clobber in-progress swap/tab state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, enrichedTargets.length]);

  if (state === "loading") return <LoadingCard title="Loading compare panel" body="Fetching review item detail and compare targets." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message={errorMessage ?? "Review item detail failed to load."} />;
  if (state === "empty" || !detail) return <EmptyState title="No review selected" body="Select an open review item to compare targets and record a decision." />;

  const targets = order.map((index) => enrichedTargets[index]).filter((target): target is EnrichedTarget => Boolean(target));
  const isPairCompare = targets.length >= 2;
  const confidence = confidencePercent(detail.confidence);

  return (
    <Card className="overflow-hidden p-0" data-testid="reviews-compare-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <b>{isPairCompare ? "Compare:" : "Review:"}</b>
          {targets.map((target, index) => (
            <span key={target.index} className="flex items-center gap-1">
              {index > 0 && <span className="muted">vs.</span>}
              <span>{target.title}</span>
              {target.versionNumber && <span className="mono text-[10px] text-slate-400">{target.versionNumber}</span>}
            </span>
          ))}
          <Tag tone="ai">AI Confidence: {confidence}%</Tag>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <label className="flex items-center gap-1.5 text-slate-500">
            <span>Manual Override</span>
            <button
              type="button"
              role="switch"
              aria-checked={manualOverride}
              aria-label="Toggle manual override of the AI-suggested action"
              className={`toggle ${manualOverride ? "on" : ""}`}
              onClick={onToggleManualOverride}
            />
          </label>
          <button type="button" className="btn btn-sm" aria-expanded={aiDetailsOpen} onClick={() => setAiDetailsOpen((open) => !open)}>
            <Sparkles size={12} color="var(--ai)" /> AI Analysis Details {aiDetailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button type="button" className="icon-btn" aria-label="Open full multi-item compare drawer" disabled={targets.length < 2} title={targets.length < 2 ? "Compare needs at least two targets" : "Open full compare drawer"} onClick={onOpenDrawer}>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {aiDetailsOpen && (
        <div className="border-b border-slate-100 bg-violet-50/60 px-3.5 py-2.5 text-xs text-violet-950">
          <b>Rationale:</b> {detail.rationale || "No rationale was provided by the candidate source."}
          <div className="mt-1 text-[11px] text-violet-800">Suggested action: {detail.suggestedAction ?? "n/a"} · Source: {detail.source} · Queue: {detail.queueType}</div>
        </div>
      )}

      <div className={`grid gap-0 bg-[var(--bg)] p-3.5 ${targets.length >= 2 ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-1"}`}>
        {targets.map((target, index) => (
          <Fragment key={target.index}>
            <DeckCard target={target} label={index === 0 ? "Left" : "Right"} />
            {index === 0 && targets.length >= 2 && (
              <div className="flex items-center justify-center px-2">
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--paper)" }}
                  aria-label="Swap left and right compare targets"
                  onClick={() => setOrder((current) => [current[1] ?? 1, current[0] ?? 0])}
                >
                  <ArrowLeftRight size={13} />
                </button>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="border-t border-slate-200">
        <div className="flex flex-wrap gap-0 border-b border-slate-100 px-3.5" role="tablist">
          {COMPARE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              onClick={() => setActiveTab(tab.id)}
              className="tab"
              aria-selected={activeTab === tab.id}
              style={activeTab === tab.id ? { borderBottomColor: "var(--primary)", color: "var(--primary)", fontWeight: 600 } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-3.5">
          {activeTab === "content" && <ContentComparisonTab targets={targets} />}
          {activeTab === "comments" && <CommentsTab targets={targets} />}
          {activeTab === "provenance" && <ProvenanceTab targets={targets} />}
          {activeTab === "version" && <VersionHistoryTab targets={targets} />}
          {activeTab === "activity" && <ActivityTab />}
        </div>
      </div>
    </Card>
  );
}

function DeckCard({ target, label }: { target: EnrichedTarget; label: string }) {
  const previewUrl = assetUrl(target.renderUri ?? target.thumbnailUri);
  return (
    <div>
      <div className="mb-0.5 text-[13px] font-semibold text-slate-900">
        {target.title} {target.versionNumber && <span className="mono ml-1 text-[10px] font-medium text-slate-400">{target.versionNumber}</span>}
      </div>
      <div className="muted mb-2.5 text-[11px]">
        {target.approvalState ?? "unknown status"} · {target.cacheStatus === "loading" ? "loading detail…" : formatDate(target.createdAt)}
      </div>
      {target.isRestricted ? (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500">
          <ShieldAlert size={20} /> <span className="mt-1 text-xs">Restricted preview hidden</span>
        </div>
      ) : previewUrl ? (
        <div className="aspect-video rounded-lg border border-slate-200 bg-cover bg-center shadow-sm" style={{ backgroundImage: `url("${previewUrl}")` }} role="img" aria-label={`${label} compare target: ${target.title}`} />
      ) : (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
          {target.cacheStatus === "loading" ? "Loading preview…" : "No preview available"}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1">
        <a className={`icon-btn borderless ${!previewUrl ? "pointer-events-none opacity-40" : ""}`} href={previewUrl} target="_blank" rel="noreferrer" aria-label={`View ${target.title} full size`} title="View full size">
          <Eye size={12} />
        </a>
        <a className={`icon-btn borderless ${!previewUrl ? "pointer-events-none opacity-40" : ""}`} href={previewUrl} download aria-label={`Download ${target.title} preview`} title="Download preview">
          <Download size={12} />
        </a>
        <button type="button" className="icon-btn borderless" disabled aria-label="More actions (not available yet)" title="More actions are not available yet">
          <MoreHorizontal size={12} />
        </button>
      </div>
    </div>
  );
}

function ContentComparisonTab({ targets }: { targets: EnrichedTarget[] }) {
  if (targets.some((target) => target.cacheStatus === "loading")) return <p className="m-0 text-xs text-slate-500">Loading extracted text…</p>;
  const anyText = targets.some((target) => target.extractedText);
  if (!anyText) return <EmptyState title="No extracted text" body="Neither target has extracted text recorded on its ContentUnit version." />;
  return (
    <div className={`grid gap-3 ${targets.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {targets.map((target) => (
        <div key={target.index}>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">{target.title}</div>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            {target.extractedText || <span className="text-slate-400">No extracted text on this version.</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentsTab({ targets }: { targets: EnrichedTarget[] }) {
  const [byTarget, setByTarget] = useState<Record<string, { state: LoadState; items: Comment[] }>>({});
  const [replyTo, setReplyTo] = useState<string | undefined>(targets[0]?.versionId);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setReplyTo(targets[0]?.versionId);
  }, [targets]);

  useEffect(() => {
    for (const target of targets) {
      const versionId = target.versionId;
      if (!versionId || byTarget[versionId]) continue;
      setByTarget((previous) => ({ ...previous, [versionId]: { state: "loading", items: [] } }));
      boxbrainApi
        .listComments("content_unit_version", versionId)
        .then((items) => setByTarget((previous) => ({ ...previous, [versionId]: { state: items.length ? "ready" : "empty", items } })))
        .catch((error: unknown) => {
          const nextState: LoadState = error instanceof ApiError && (error.status === 401 || error.status === 403) ? "restricted" : "error";
          setByTarget((previous) => ({ ...previous, [versionId]: { state: nextState, items: [] } }));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets]);

  const allComments = targets.flatMap((target) => (target.versionId ? (byTarget[target.versionId]?.items ?? []).map((comment) => ({ comment, target })) : []));
  const anyLoading = targets.some((target) => target.versionId && byTarget[target.versionId]?.state === "loading");
  const anyRestricted = targets.some((target) => target.versionId && byTarget[target.versionId]?.state === "restricted");
  const anyError = targets.some((target) => target.versionId && byTarget[target.versionId]?.state === "error");

  async function submitComment() {
    if (!replyTo || !body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await boxbrainApi.createComment({ kind: "review_comment", targetType: "content_unit_version", targetId: replyTo, body: body.trim() });
      setByTarget((previous) => ({ ...previous, [replyTo]: { state: "ready", items: [...(previous[replyTo]?.items ?? []), created] } }));
      setBody("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Comment could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {anyRestricted && <RestrictedCopy compact />}
      {anyError && <p className="mb-2 text-xs text-red-600">Some comments failed to load for one of the compare targets.</p>}
      {anyLoading && allComments.length === 0 && <p className="m-0 text-xs text-slate-500">Loading comments…</p>}
      {!anyLoading && allComments.length === 0 && !anyRestricted && !anyError && <p className="m-0 mb-3 text-xs text-slate-500">No comments recorded on either compare target yet.</p>}

      <div className="grid gap-2.5">
        {allComments
          .slice()
          .sort((a, b) => new Date(b.comment.createdAt ?? 0).getTime() - new Date(a.comment.createdAt ?? 0).getTime())
          .map(({ comment, target }) => (
            <div key={comment.id} className="flex items-start gap-2 border-b border-dashed border-slate-200 pb-2.5 last:border-0">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600" aria-hidden="true">
                {comment.kind === "review_comment" ? "R" : "C"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700">{target.title}</span>
                  <span className="text-slate-400">{formatDateTime(comment.createdAt)}</span>
                  <Tag size="sm">{comment.status}</Tag>
                </div>
                <div className="text-xs leading-relaxed text-slate-700">{comment.body}</div>
              </div>
            </div>
          ))}
      </div>

      {targets.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 p-2.5">
          {targets.length > 1 && (
            <label className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
              Comment on
              <select className="h-7 rounded border border-slate-200 px-1.5 text-[11px]" value={replyTo} onChange={(event) => setReplyTo(event.target.value)}>
                {targets.map((target) => (
                  <option key={target.versionId} value={target.versionId}>
                    {target.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <textarea
            className="min-h-16 w-full resize-y rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-blue-300"
            placeholder="Add a review comment…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {submitError && <p className="m-0 mt-1 text-xs text-red-600">{submitError}</p>}
          <div className="mt-1.5 flex justify-end">
            <button type="button" className="btn btn-primary btn-sm" disabled={submitting || !body.trim() || !replyTo} onClick={() => void submitComment()}>
              {submitting ? "Posting…" : "Add Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProvenanceTab({ targets }: { targets: EnrichedTarget[] }) {
  if (targets.some((target) => target.cacheStatus === "loading")) return <p className="m-0 text-xs text-slate-500">Loading provenance…</p>;
  const anyProvenance = targets.some((target) => target.provenance);
  if (!anyProvenance) return <EmptyState title="No provenance recorded" body="Neither compare target has a provenance record." />;
  return (
    <div className={`grid gap-3 ${targets.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {targets.map((target) => (
        <div key={target.index} className="rounded-lg border border-slate-200 p-3 text-xs">
          <div className="mb-2 font-bold text-slate-700">{target.title}</div>
          {target.provenance ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
              <dt className="text-slate-500">Origin</dt>
              <dd className="m-0">{target.provenance.originType}</dd>
              <dt className="text-slate-500">Source system</dt>
              <dd className="m-0">{target.provenance.sourceSystem ?? "—"}</dd>
              <dt className="text-slate-500">Source refs</dt>
              <dd className="m-0">{target.provenance.sourceRefs?.length ? target.provenance.sourceRefs.join("; ") : "—"}</dd>
              <dt className="text-slate-500">Pipeline</dt>
              <dd className="m-0">{target.provenance.pipelineVersion ?? "—"}</dd>
              <dt className="text-slate-500">Recorded</dt>
              <dd className="m-0">{formatDate(target.provenance.createdAt)}</dd>
            </dl>
          ) : (
            <span className="text-slate-400">No provenance record.</span>
          )}
        </div>
      ))}
    </div>
  );
}

function VersionHistoryTab({ targets }: { targets: EnrichedTarget[] }) {
  const [byVariant, setByVariant] = useState<Record<string, { state: LoadState; items: ContentUnitVersion[] }>>({});

  useEffect(() => {
    for (const target of targets) {
      const variantId = target.variantId;
      if (!variantId || byVariant[variantId]) continue;
      setByVariant((previous) => ({ ...previous, [variantId]: { state: "loading", items: [] } }));
      boxbrainApi
        .listContentUnitVersions(variantId)
        .then((page) => setByVariant((previous) => ({ ...previous, [variantId]: { state: page.items.length ? "ready" : "empty", items: page.items } })))
        .catch((error: unknown) => {
          const nextState: LoadState = error instanceof ApiError && (error.status === 401 || error.status === 403) ? "restricted" : "error";
          setByVariant((previous) => ({ ...previous, [variantId]: { state: nextState, items: [] } }));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets]);

  const withVariant = targets.filter((target) => target.variantId);
  if (withVariant.length === 0) return <p className="m-0 text-xs text-slate-500">Version history is unavailable until the compare target&rsquo;s variant has finished loading.</p>;

  return (
    <div className={`grid gap-3 ${withVariant.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {withVariant.map((target) => {
        const entry = target.variantId ? byVariant[target.variantId] : undefined;
        return (
          <div key={target.index}>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">{target.title}</div>
            {!entry || entry.state === "loading" ? <p className="m-0 text-xs text-slate-500">Loading versions…</p> : null}
            {entry?.state === "restricted" && <RestrictedCopy compact />}
            {entry?.state === "error" && <p className="m-0 text-xs text-red-600">Version history failed to load.</p>}
            {entry?.state === "empty" && <p className="m-0 text-xs text-slate-500">No other versions recorded for this variant.</p>}
            {entry?.state === "ready" && (
              <ul className="m-0 list-none p-0">
                {entry.items.map((version) => (
                  <li key={version.id} className="flex items-center justify-between border-b border-dashed border-slate-200 py-1.5 text-xs last:border-0">
                    <span className="mono">{version.versionNumber}</span>
                    <span className="text-slate-500">{formatDate(version.createdAt)}</span>
                    <Tag tone={version.approvalState === "approved" ? "ok" : "neutral"} size="sm">
                      {version.approvalState}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab() {
  return (
    <EmptyState
      title="Per-target activity trail not available yet"
      body="GET /api/admin/audit-events exists but requires admin access, has no targetId/targetType filter, and has no client wrapper in lib/api.ts (audit-digest.md ## reviews). Org-wide audit events can be reviewed from Admin once that gap is closed."
    />
  );
}
