import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { aiRecommendations, matchTone, topPlays, topSlides } from "@/features/opportunities/data";

export function WorkspaceInsights() {
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="opportunity-workspace-insights">
      <div className="ai-panel">
        <h4>
          <Sparkles size={14} aria-hidden="true" /> BoxBrain AI
        </h4>
        <div className="ai-body">Illustrative recommendations for this preview opportunity, based on account context and similar deal patterns.</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {aiRecommendations.map((item) => (
            <div key={item.title} className="card p-2.5 text-[11px]">
              <b className="text-xs text-slate-900">{item.title}</b>
              <div className="mt-1 text-slate-500">{item.detail}</div>
              <div className="mt-1.5 font-semibold text-[var(--ok)]">{item.impact}</div>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-xs font-bold uppercase tracking-[0.04em] text-slate-700">Top Plays</b>
          <Link href="/plays" className="text-xs font-semibold text-[var(--primary)]">
            View all Plays
          </Link>
        </div>
        {topPlays.map((play, index) => (
          <div key={play.title} className={`flex items-center gap-2 py-2.5 ${index < topPlays.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-bg)] text-[var(--primary)]">
              <Sparkles size={12} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex items-center gap-2">
                <b className="text-slate-900">{play.title}</b>
                {play.best && <Badge kind="ok">Best Match</Badge>}
              </div>
              <div className="text-slate-500">{play.detail}</div>
            </div>
            <span className={`match-score ${matchTone(play.match)}`}>{play.match} Match Score</span>
          </div>
        ))}
      </Card>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-xs font-bold uppercase tracking-[0.04em] text-slate-700">Top Slides</b>
          <Link href="/library" className="text-xs font-semibold text-[var(--primary)]">
            View full slide ranking
          </Link>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Slide</th>
              <th>Source</th>
              <th>Relevance</th>
              <th>Last Used</th>
            </tr>
          </thead>
          <tbody>
            {topSlides.map((slide) => (
              <tr key={slide.rank}>
                <td className="font-semibold">{slide.rank}</td>
                <td>{slide.title}</td>
                <td className="text-slate-500">{slide.source}</td>
                <td>
                  <span className={`match-score sm ${matchTone(slide.relevance)}`}>{slide.relevance}</span>
                </td>
                <td className="text-slate-500">{slide.lastUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} aria-hidden="true" /> High Relevance (80+)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--warn)" }} aria-hidden="true" /> Medium (70-79)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} aria-hidden="true" /> Low (&lt;70)
          </span>
        </div>
      </Card>
    </div>
  );
}
