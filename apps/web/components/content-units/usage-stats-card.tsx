import { BarChart3 } from "lucide-react";

/** Honest empty state: no usage-metrics endpoint exists in the API yet (see audit-digest.md API
 * NEEDS), so this never renders fabricated view/download/share counts. */
export function UsageStatsCard() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <BarChart3 size={14} className="text-[var(--ink-3)]" aria-hidden="true" /> Usage Stats (30d)
      </div>
      <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-xs text-[var(--ink-3)]">
        Usage telemetry (views, downloads, adds to decks, shares) isn&rsquo;t tracked by the API yet. Coming soon.
      </div>
    </div>
  );
}
