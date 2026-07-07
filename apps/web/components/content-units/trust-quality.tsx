import { CheckCircle2, Circle } from "lucide-react";
import type { ContentUnitVersion, ProvenanceRecord } from "@/lib/api";
import { formatDate, normalizeScore, scoreDescriptor } from "@/features/content-units/lib";
import { ScorePillRow, ScorePillRowUnavailable } from "./score-pill-row";

type ChecklistItem = { label: string; satisfied: boolean; detail?: string };

/**
 * The design mock always shows 4 green checkmarks. That is not honest for arbitrary ContentUnits, so
 * each item here is derived from a real, already-loaded field and can render as "not yet" when the
 * underlying signal says so (e.g. a stale or unapproved version).
 */
function buildChecklist(version: ContentUnitVersion | undefined, provenance: ProvenanceRecord | undefined): ChecklistItem[] {
  return [
    { label: "Source verified", satisfied: Boolean(provenance?.sourceRefs?.length || provenance?.sourceSystem) },
    { label: "Data consistent", satisfied: version?.freshnessState !== "stale" },
    {
      label: "Recently updated",
      satisfied: version?.freshnessState === "fresh",
      detail: version?.createdAt ? formatDate(version.createdAt) : undefined
    },
    { label: "Owner validated", satisfied: version?.approvalState === "approved" }
  ];
}

export function TrustQualityCard({ version, provenance }: { version?: ContentUnitVersion; provenance?: ProvenanceRecord }) {
  const quality = normalizeScore(version?.qualityScore);
  const usage = normalizeScore(version?.usageScore);
  const checklist = buildChecklist(version, provenance);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="grid gap-1 text-xs">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 py-0.5">
            {item.satisfied ? <CheckCircle2 size={13} color="var(--ok)" aria-hidden="true" /> : <Circle size={13} color="var(--ink-4)" aria-hidden="true" />}
            <span className={item.satisfied ? "text-[var(--ink)]" : "text-[var(--ink-3)]"}>{item.label}</span>
            {item.detail && <span className="muted ml-auto text-[11px]">{item.detail}</span>}
          </div>
        ))}
      </div>
      <div className="grid content-start gap-2.5">
        {quality == null ? (
          <ScorePillRowUnavailable label="Quality score" reason="No qualityScore was returned for this version." />
        ) : (
          <ScorePillRow value={quality} label="Quality score" description={scoreDescriptor(quality, "quality")} />
        )}
        <ScorePillRowUnavailable label="Relevance score" reason="The API does not return a relevance score for ContentUnit versions yet." />
        {usage == null ? (
          <ScorePillRowUnavailable label="Usage score" reason="No usageScore was returned for this version." />
        ) : (
          <ScorePillRow value={usage} label="Usage score" description={scoreDescriptor(usage, "usage")} />
        )}
      </div>
    </div>
  );
}

