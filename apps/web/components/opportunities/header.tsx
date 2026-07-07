import { Building2, MoreHorizontal, Share2, Star } from "lucide-react";
import { AvatarStack, Badge, Tag } from "@/components/ui";
import type { OpportunityRecord } from "@/features/opportunities/data";

export function OpportunityHeader({ opportunity }: { opportunity: OpportunityRecord }) {
  return (
    <div className="page-head-row" data-testid="opportunity-header">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-bg)] text-[var(--primary)]">
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-950">{opportunity.name}</h1>
            <Star size={16} color="var(--ink-4)" aria-hidden="true" />
            <Badge kind="ok" dot>
              {opportunity.status}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {opportunity.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <div className="text-sm font-bold text-slate-900">{opportunity.amount}</div>
          <div className="text-slate-500">
            Close {opportunity.closeDate} ({opportunity.daysToClose} days)
          </div>
          <div className="text-slate-500">Stage: {opportunity.stage}</div>
        </div>
        <AvatarStack people={opportunity.team} max={4} />
        <button type="button" className="btn btn-ghost btn-sm" aria-disabled="true" title="Sharing is illustrative in this preview">
          <Share2 size={14} aria-hidden="true" /> Share
        </button>
        <button type="button" className="icon-btn" aria-label="More opportunity actions" aria-disabled="true">
          <MoreHorizontal size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
