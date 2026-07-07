import { Card, ScorePill, StatusBadge } from "@/components/ui";
import { activityFeed, dealHealthTone, type OpportunityRecord } from "@/features/opportunities/data";

export function ContextPanel({ opportunity }: { opportunity: OpportunityRecord }) {
  const dealFields: Array<[string, string]> = [
    ["Engagement", opportunity.dealHealth.engagement],
    ["Budget", opportunity.dealHealth.budget],
    ["Competition", opportunity.dealHealth.competition],
    ["Timeline", opportunity.dealHealth.timeline]
  ];

  return (
    <Card className="p-4" data-testid="opportunity-context-panel">
      <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-500">Context Snapshot</div>
      <dl className="flex flex-col gap-2 text-xs">
        <Field label="Customer" value={opportunity.customer} />
        <Field label="Industry" value={opportunity.industry} />
        <Field label="Regions" value={opportunity.regions} />
        <Field label="Opportunity Owner" value={opportunity.owner} />
        <Field label="Solution Area" value={opportunity.solutionArea} />
        <Field label="Decision Criteria" value={opportunity.decisionCriteria} />
        <Field label="Pain Points" value={opportunity.painPoints} />
      </dl>

      <div className="mt-3.5 border-t border-slate-200 pt-3.5">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-500">Deal Health</div>
        <div className="flex items-center gap-3">
          <ScorePill value={opportunity.dealHealth.score} label="deal health" />
          <div className="text-sm font-bold text-slate-900">{dealHealthLabel(opportunity.dealHealth.score)}</div>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5 text-xs">
          {dealFields.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="flex-1 text-slate-500">{label}</span>
              <StatusBadge tone={dealHealthTone(value)}>{value}</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 border-t border-slate-200 pt-3.5">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-500">Team &amp; Collaboration</div>
        {activityFeed.map((entry, index) => (
          <div key={`${entry.who}-${entry.when}`} className={`flex items-start gap-2 py-1.5 ${index < activityFeed.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}>
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{initials(entry.who)}</span>
            <div className="min-w-0 flex-1 text-xs">
              <div>
                <b>{entry.who}</b> <span className="text-slate-500">{entry.action}</span> <span className="text-[11px] text-slate-400">· {entry.when}</span>
              </div>
              {entry.detail && <div className="mt-0.5 text-[11px] text-slate-500">&ldquo;{entry.detail}&rdquo;</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

function dealHealthLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  return "At risk";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
