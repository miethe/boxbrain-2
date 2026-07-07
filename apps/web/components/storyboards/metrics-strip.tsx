"use client";

import type { StoryboardDiagnostics, StoryboardSection } from "@/lib/api";
import { breakdownWarnings, countGapSlots, countSlots, healthDescriptor, type Tone } from "@/features/storyboards/lib";

type Tile = {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
  disabled?: boolean;
  onClick?: () => void;
};

export function MetricsStrip({
  diagnostics,
  sections,
  onReviewWarnings
}: {
  diagnostics: StoryboardDiagnostics;
  sections: StoryboardSection[];
  onReviewWarnings: () => void;
}) {
  const healthScore = diagnostics.narrativeScore == null ? null : Math.round(diagnostics.narrativeScore * 100);
  const health = healthDescriptor(healthScore);
  const duplicates = diagnostics.warnings.filter((warning) => warning.code === "duplicate_selection").length;
  const gaps = countGapSlots(sections);
  const breakdown = breakdownWarnings(diagnostics.warnings);

  const tiles: Tile[] = [
    {
      label: "Storyboard Health",
      value: healthScore == null ? "—" : String(healthScore),
      sub: health.label,
      tone: health.tone
    },
    {
      label: "Coverage",
      value: "—",
      sub: "Not available — requires topic-coverage modeling the API doesn't compute yet.",
      disabled: true
    },
    {
      label: "Duplicates",
      value: String(duplicates),
      sub: duplicates > 0 ? "Reused content — review" : "No duplicates detected",
      tone: duplicates > 0 ? "warn" : "ok",
      onClick: duplicates > 0 ? onReviewWarnings : undefined
    },
    {
      label: "Weak Transitions",
      value: "—",
      sub: "Not available — no transition-quality signal from the API yet.",
      disabled: true
    },
    {
      label: "Read Time",
      value: "—",
      sub: "Backend stores an estimate per section but doesn't expose it via the API yet.",
      disabled: true
    },
    {
      label: "Diagnostics",
      value: String(breakdown.total),
      sub:
        breakdown.total === 0
          ? "No warnings"
          : [breakdown.critical && `${breakdown.critical} critical`, breakdown.warning && `${breakdown.warning} warning`, breakdown.info && `${breakdown.info} info`].filter(Boolean).join(" · "),
      tone: breakdown.critical > 0 ? "danger" : breakdown.warning > 0 ? "warn" : "ok",
      onClick: breakdown.total > 0 ? onReviewWarnings : undefined
    }
  ];

  return (
    <div className="card mt-3 p-3" data-testid="storyboard-metrics-strip">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className={tile.disabled ? "opacity-50" : ""} title={tile.disabled ? tile.sub : undefined}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-3)]">{tile.label}</div>
            <div className="text-[20px] font-bold leading-none tracking-tight" style={{ color: tile.disabled ? "var(--ink-4)" : toneColor(tile.tone) }}>
              {tile.value}
            </div>
            {tile.onClick ? (
              <button type="button" onClick={tile.onClick} className="link mt-1 text-[10px]">
                {tile.sub}
              </button>
            ) : (
              <div className="muted mt-1 text-[10px]">{tile.disabled ? "Not available" : tile.sub}</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-right text-[9.5px] text-[var(--ink-4)]">
        {countSlots(sections)} total slots · {gaps} gap{gaps === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function toneColor(tone?: Tone) {
  if (tone === "ok") return "var(--ok)";
  if (tone === "warn") return "var(--warn)";
  if (tone === "danger") return "var(--danger)";
  if (tone === "primary") return "var(--primary)";
  return "var(--ink-2)";
}
