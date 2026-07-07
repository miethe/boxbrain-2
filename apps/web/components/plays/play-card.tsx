import Link from "next/link";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui";
import type { PlayRecord } from "@/features/plays/data";
import { PlayIcon } from "@/components/plays/play-icon";

export function PlayCard({ play }: { play: PlayRecord }) {
  return (
    <Link href={`/plays/${play.id}`} className="card card-hoverable p-4" data-testid={`play-card-${play.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]" style={{ background: play.gradient }}>
          <PlayIcon iconKey={play.iconKey} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="text-sm">{play.title}</b>
            {play.verified && (
              <Badge kind="ok">
                <CheckCircle2 size={11} aria-hidden="true" /> Verified
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{play.summary}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <TrendingUp size={11} aria-hidden="true" /> {play.stats.uses} uses
        </span>
        {play.stats.winRate !== undefined && (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} color="var(--ok)" aria-hidden="true" /> {play.stats.winRate}% win rate
          </span>
        )}
      </div>
    </Link>
  );
}
