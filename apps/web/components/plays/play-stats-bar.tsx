import { Card } from "@/components/ui";
import type { PlayStats } from "@/features/plays/data";

const sparkPaths = [
  "M0 16 L20 14 L40 12 L60 10 L80 8 L100 6",
  "M0 14 L20 12 L40 15 L60 8 L80 10 L100 5",
  "M0 18 L20 15 L40 11 L60 13 L80 7 L100 4",
  "M0 12 L20 14 L40 11 L60 9 L80 11 L100 8",
  "M0 16 L20 13 L40 14 L60 10 L80 8 L100 5"
];

export function PlayStatsBar({ stats }: { stats: PlayStats }) {
  const entries: Array<{ label: string; value: string; hint: string }> = [
    { label: "Usage", value: String(stats.uses), hint: "Times used" },
    ...(stats.winRate !== undefined ? [{ label: "Win Rate", value: `${stats.winRate}%`, hint: "Preview win rate" }] : []),
    ...(stats.dealSize ? [{ label: "Avg. Deal Size Increase", value: stats.dealSize, hint: "vs. baseline" }] : []),
    ...(stats.timeToValue ? [{ label: "Time to Value", value: stats.timeToValue, hint: "Median time to close" }] : []),
    ...(stats.adoption ? [{ label: "Adoption", value: stats.adoption, hint: "Rep adoption rate" }] : [])
  ];

  return (
    <Card className="mt-3 overflow-hidden p-0" data-testid="play-stats-bar">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}>
        {entries.map((entry, index) => (
          <div key={entry.label} className={`p-4 ${index < entries.length - 1 ? "border-r border-[var(--line-soft)]" : ""}`}>
            <div className="text-xs text-slate-500">{entry.label}</div>
            <div className="mt-0.5 text-[26px] font-bold tracking-tight text-slate-950">{entry.value}</div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <div className="text-[11px] text-slate-500">{entry.hint}</div>
              <svg className="spark-svg" viewBox="0 0 100 22" preserveAspectRatio="none" style={{ width: 54, height: 18 }} aria-hidden="true">
                <path className="line up" d={sparkPaths[index % sparkPaths.length]} />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
