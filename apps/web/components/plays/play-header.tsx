import { CheckCircle2, Star } from "lucide-react";
import { Badge, Card, Tag } from "@/components/ui";
import type { PlayRecord } from "@/features/plays/data";
import { PlayIcon } from "@/components/plays/play-icon";

export function PlayHeader({ play }: { play: PlayRecord }) {
  return (
    <Card className="p-5" data-testid="play-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl" style={{ background: play.gradient }}>
          <PlayIcon iconKey={play.iconKey} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          {play.verified && (
            <div className="mb-1.5">
              <Badge kind="ok">
                <CheckCircle2 size={11} aria-hidden="true" /> Verified
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-950">{play.title}</h1>
            <Star size={18} color="var(--ink-4)" aria-hidden="true" />
          </div>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">{play.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {play.tags.map((tag) => (
              <Tag key={tag} tone="blue">
                {tag}
              </Tag>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs sm:w-[170px]">
          <div className="text-slate-400">Owner</div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <div>
              <div className="text-left text-sm font-semibold text-slate-900">{play.owner}</div>
              <div className="text-left text-[11px] text-slate-400">{play.ownerRole}</div>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {initials(play.owner)}
            </span>
          </div>
          <div className="mt-3 text-slate-400">Last updated</div>
          <div className="text-sm font-semibold text-slate-900">{play.updated}</div>
        </div>
      </div>
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
