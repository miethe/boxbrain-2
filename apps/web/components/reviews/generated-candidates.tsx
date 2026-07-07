"use client";

import { Card, StatusBadge, Tag } from "@/components/ui";
import { normalizeReviewAction, type GeneratedReviewCandidate } from "@/lib/api";
import { ACTION_LABELS } from "@/features/reviews/constants";
import { confidencePercent, queueLabel } from "@/features/reviews/format";
import type { LoadState } from "@/features/reviews/types";
import { ErrorState, LoadingCard, RestrictedCopy } from "./shared";

export function GeneratedCandidates({ state, candidates }: { state: LoadState; candidates: GeneratedReviewCandidate[] }) {
  if (state === "idle") return null;
  if (state === "loading") return <LoadingCard title="Generating candidates" body="Running the deterministic backend candidate scan (falls back to a search-based preview scan if unavailable)." />;
  if (state === "restricted") return <RestrictedCopy />;
  if (state === "error") return <ErrorState message="Candidate generation failed." />;
  if (state === "empty") return <EmptyGenerated />;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-bold">Generated candidate scan</h2>
        <Tag tone="ai">{candidates.every((candidate) => candidate.persisted) ? "persisted to open queues" : "not persisted"}</Tag>
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
              {candidate.suggestedAction && <Tag>{ACTION_LABELS[normalizeReviewAction(candidate.suggestedAction)]}</Tag>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyGenerated() {
  return (
    <Card className="p-6 text-center">
      <div className="text-sm font-bold text-slate-800">No generated candidates</div>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">The scan did not return enough unrestricted results to form new candidate pairs.</p>
    </Card>
  );
}
