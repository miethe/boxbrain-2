"use client";

import { Sparkles } from "lucide-react";
import { Card, Meter } from "@/components/ui";
import type { StatusChips } from "@/lib/api";
import { healthBucketFor, type HealthBucket } from "@/features/library/format";

export function InsightsRail({ items }: { items: Array<{ statusChips?: StatusChips }> }) {
  const total = items.length;
  const buckets = items.reduce(
    (acc, item) => {
      acc[healthBucketFor(item.statusChips)] += 1;
      return acc;
    },
    { trusted: 0, review: 0, outdated: 0 } as Record<HealthBucket, number>
  );
  const freshCount = items.filter((item) => item.statusChips?.freshnessState === "fresh").length;
  const trustedPct = total ? Math.round((buckets.trusted / total) * 100) : 0;
  const reviewPct = total ? Math.round((buckets.review / total) * 100) : 0;
  const outdatedPct = total ? Math.max(0, 100 - trustedPct - reviewPct) : 0;
  const freshPct = total ? Math.round((freshCount / total) * 100) : 0;
  const healthDescriptor = trustedPct >= 80 ? "Healthy" : trustedPct >= 55 ? "Needs attention" : "At risk";
  const healthTone = trustedPct >= 80 ? "var(--ok)" : trustedPct >= 55 ? "var(--warn)" : "var(--danger)";

  return (
    <Card className="sticky top-4 p-4" data-testid="library-insights-rail">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} color="var(--ai)" aria-hidden="true" />
        <b className="text-[13px]">Insights</b>
      </div>

      <div className="palette-group-label" style={{ paddingLeft: 0 }}>
        Top Content <span className="ml-1 text-[10px] font-normal text-[var(--ink-4)]">By views in last 30 days</span>
      </div>
      <div className="rounded-md border border-dashed border-[var(--line-2)] bg-[var(--bg-2)] p-3 text-xs text-[var(--ink-4)]">
        Usage analytics (views, downloads) are not tracked by the API yet, so a real &ldquo;top content&rdquo; ranking cannot be shown honestly. This panel will populate
        once usage telemetry is captured.
      </div>

      <div className="palette-group-label mt-4" style={{ paddingLeft: 0 }}>
        Content Health
      </div>
      {total === 0 ? (
        <p className="m-0 text-xs text-[var(--ink-4)]">No catalog items loaded yet.</p>
      ) : (
        <>
          <div className="text-xs text-[var(--ink-3)]">Computed from {total} loaded catalog item{total === 1 ? "" : "s"}</div>
          <div className="mt-2 flex items-center gap-3">
            <Meter value={trustedPct} kind={trustedPct >= 80 ? undefined : trustedPct >= 55 ? "mid" : "low"} />
            <div className="text-xs font-semibold" style={{ color: healthTone }}>
              {healthDescriptor}
            </div>
          </div>
          <div className="mt-2.5 text-[11px]">
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} />
              Trusted <span className="ml-auto font-semibold">{trustedPct}%</span>
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--warn)" }} />
              Needs Review <span className="ml-auto font-semibold">{reviewPct}%</span>
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} />
              Outdated <span className="ml-auto font-semibold">{outdatedPct}%</span>
            </div>
          </div>
        </>
      )}

      <div className="palette-group-label mt-4" style={{ paddingLeft: 0 }}>
        Freshness
      </div>
      {total === 0 ? (
        <p className="m-0 text-xs text-[var(--ink-4)]">No catalog items loaded yet.</p>
      ) : (
        <>
          <div className="text-[11px] text-[var(--ink-3)]">Share of loaded content marked fresh</div>
          <div className="mt-1 text-[26px] font-bold tracking-tight">{freshPct}%</div>
          <p className="m-0 mt-1 text-[11px] text-[var(--ink-4)]">Trend vs. prior period is not available (requires historical snapshots the API does not retain).</p>
        </>
      )}

      <div className="palette-group-label mt-4" style={{ paddingLeft: 0 }}>
        Recommendations
      </div>
      <div className="rounded-md border border-dashed border-[var(--line-2)] bg-[var(--bg-2)] p-3 text-xs text-[var(--ink-4)]">
        AI-suggested content recommendations require a recommendations endpoint that does not exist yet. No suggestions are fabricated here.
      </div>
    </Card>
  );
}
