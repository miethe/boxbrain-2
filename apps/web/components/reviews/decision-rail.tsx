"use client";

import { Check, CheckCircle2, Copy, GitBranch, Layers, Link2, Lock, ShieldAlert, Sparkles, X, XCircle } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { normalizeReviewAction, type ReviewActionKind, type ReviewItemDetail } from "@/lib/api";
import { COMPARE_SUGGESTED_ACTIONS, ACTION_LABELS } from "@/features/reviews/constants";
import { confidencePercent, daysBetween, formatDate } from "@/features/reviews/format";
import type { ActionState, EnrichedTarget, LoadState } from "@/features/reviews/types";
import { ErrorState, LoadingCard, RestrictedCopy } from "./shared";

const ACTION_ICONS: Record<ReviewActionKind, typeof Link2> = {
  "mark-variant": Link2,
  "mark-similar": Copy,
  "merge-versions": Layers,
  "set-canonical": Check,
  accept: CheckCircle2,
  approve: CheckCircle2,
  reject: X,
  "request-changes": GitBranch
};

export function DecisionRail({
  detail,
  state,
  errorMessage,
  enrichedTargets,
  actionState,
  actionMessage,
  reason,
  onReasonChange,
  manualOverride,
  onAction
}: {
  detail: ReviewItemDetail | null;
  state: LoadState;
  errorMessage: string | null;
  enrichedTargets: EnrichedTarget[];
  actionState: ActionState;
  actionMessage: string | null;
  reason: string;
  onReasonChange: (value: string) => void;
  manualOverride: boolean;
  onAction: (action: ReviewActionKind) => void;
}) {
  if (state === "loading") return <LoadingCard title="Loading decision panel" body="Fetching AI confidence, suggested action, and provenance." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message={errorMessage ?? "Review item detail failed to load."} />;
  if (state === "empty" || !detail) return <EmptyState title="No review selected" body="Select an open review item to see AI confidence, suggested actions, and provenance." />;

  const isPairCompare = detail.targetRefs.length >= 2;
  const canAct = detail.status === "open";
  const confidence = confidencePercent(detail.confidence);
  const primaryAction = normalizeReviewAction(detail.suggestedAction);
  const requiresRole = typeof detail.auditPreview.requiresRole === "string" ? detail.auditPreview.requiresRole : "reviewer";

  return (
    <div data-testid="reviews-decision-panel" className="flex flex-col gap-3">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
          <Sparkles size={13} color="var(--ai)" /> {isPairCompare ? "AI Similarity Analysis" : "AI Confidence"}
        </div>
        <div className="grid place-items-center py-1 text-center">
          <div className="text-3xl font-bold leading-none" style={{ color: "var(--primary)" }}>
            {confidence}%
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">{isPairCompare ? "Overall Similarity" : "Suggestion confidence"}</div>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-relaxed text-slate-500">
          {isPairCompare
            ? "Content / Structure / Semantic sub-scores and a matched-sections list are design-spec elements the API does not return yet — ReviewItemDetail only carries one overall confidence value."
            : "This queue type only carries a single confidence score today; no section-level breakdown exists."}
        </div>
      </Card>

      <Card className="p-4">
        <b className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">Suggested Action</b>
        <p className="m-0 mt-1.5 mb-3 text-xs leading-relaxed text-slate-500">{detail.rationale || "No rationale was provided by the candidate source."}</p>

        {isPairCompare ? (
          <div className="grid gap-2">
            {COMPARE_SUGGESTED_ACTIONS.map((entry) => {
              const Icon = ACTION_ICONS[entry.action];
              const isPrimary = !manualOverride && entry.action === primaryAction;
              const isDanger = entry.tone === "danger";
              return (
                <button
                  key={entry.action}
                  type="button"
                  disabled={!canAct || actionState === "loading"}
                  onClick={() => onAction(entry.action)}
                  className={`btn ${isPrimary ? "btn-primary" : ""} justify-start disabled:cursor-not-allowed disabled:opacity-50`}
                  style={{ height: "auto", padding: "10px 12px", borderColor: isDanger && !isPrimary ? "var(--danger)" : undefined }}
                >
                  <Icon size={14} color={isDanger && !isPrimary ? "var(--danger)" : undefined} />
                  <span className="ml-1 text-left">
                    <span className="block text-[12px] font-semibold" style={{ color: isDanger && !isPrimary ? "var(--danger)" : undefined }}>
                      {entry.label}
                    </span>
                    <span className="block text-[10px] font-normal opacity-80">{entry.sub}</span>
                  </span>
                </button>
              );
            })}
            <SecondaryActionLink disabled={!canAct || actionState === "loading"} onClick={() => onAction("request-changes")} />
          </div>
        ) : (
          <div className="grid gap-2">
            <Button variant="primary" disabled={!canAct || actionState === "loading"} onClick={() => onAction(primaryAction)}>
              <CheckCircle2 size={14} /> {actionState === "loading" ? "Recording" : ACTION_LABELS[primaryAction]}
            </Button>
            <Button disabled={!canAct || actionState === "loading"} onClick={() => onAction("reject")}>
              <XCircle size={14} /> Reject candidate
            </Button>
            <Button disabled={!canAct || actionState === "loading"} onClick={() => onAction("request-changes")}>
              <GitBranch size={14} /> Request changes
            </Button>
          </div>
        )}

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
          Decision reason
          <textarea
            className="mt-1.5 min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-xs normal-case tracking-normal text-slate-700 outline-none focus:border-blue-300"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </label>

        <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
          <Lock size={12} className="mr-1 inline" /> Action requires `{requiresRole}` access. Restricted targets suppress preview and snippet content.
        </div>

        {actionMessage && (
          <div className={`mt-2.5 rounded-lg border p-2.5 text-xs ${actionState === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {actionMessage}
          </div>
        )}
        {!canAct && (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
            <ShieldAlert size={13} className="mt-0.5" /> This review item is already `{detail.status}`; no further governance action is possible.
          </div>
        )}
      </Card>

      <Card className="p-4">
        <ProvenanceOverview targets={enrichedTargets} isPairCompare={isPairCompare} />
      </Card>
    </div>
  );
}

function SecondaryActionLink({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="link mt-1 text-left disabled:cursor-not-allowed disabled:opacity-50">
      Request changes instead — preserved for reviewers who need to send this back without a firm decision.
    </button>
  );
}

function ProvenanceOverview({ targets, isPairCompare }: { targets: EnrichedTarget[]; isPairCompare: boolean }) {
  const anyLoading = targets.some((target) => target.cacheStatus === "loading" || target.cacheStatus === "idle");
  const ready = targets.filter((target) => target.cacheStatus === "ready" && target.provenance);

  return (
    <>
      <b className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">Provenance Overview</b>
      {anyLoading && ready.length === 0 && <p className="m-0 mt-2 text-xs text-slate-500">Loading provenance…</p>}
      {!anyLoading && ready.length === 0 && <p className="m-0 mt-2 text-xs text-slate-500">No provenance record was returned for this review&rsquo;s targets.</p>}
      {ready.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 text-xs">
          {isPairCompare && ready.length >= 2 ? (
            <PairProvenance a={ready[0]} b={ready[1]} />
          ) : (
            ready.map((target) => (
              <div key={target.versionId} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{target.title}</span>
                <span className="text-right">
                  {target.provenance?.sourceSystem ?? target.provenance?.originType ?? "—"}
                  {target.provenance?.createdAt && <span className="mt-0.5 block text-[10px] text-slate-400">{formatDate(target.provenance.createdAt)}</span>}
                </span>
              </div>
            ))
          )}
        </div>
      )}
      <p className="m-0 mt-2.5 text-[10.5px] leading-snug text-slate-400">Author and collection attribution are not tracked by the API yet; only source/origin metadata shown above is real.</p>
    </>
  );
}

function PairProvenance({ a, b }: { a: EnrichedTarget; b: EnrichedTarget }) {
  const sameSource = Boolean(
    a.provenance &&
      b.provenance &&
      (a.provenance.id === b.provenance.id || (a.provenance.sourceRefs?.length && a.provenance.sourceRefs.join("|") === b.provenance.sourceRefs?.join("|")))
  );
  const divergedDays = daysBetween(a.createdAt, b.createdAt);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-500">Common source</span>
        <span className="text-right">{sameSource ? a.provenance?.sourceRefs?.[0] ?? a.provenance?.sourceSystem ?? "Shared source detected" : "No shared source identified"}</span>
      </div>
      {divergedDays !== null && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Diverged</span>
          <span className="mono">{divergedDays === 0 ? "Same day" : `${divergedDays} day${divergedDays === 1 ? "" : "s"} apart`}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-500">Source system</span>
        <span className="text-right">
          {a.provenance?.sourceSystem ?? "—"} / {b.provenance?.sourceSystem ?? "—"}
        </span>
      </div>
    </>
  );
}
