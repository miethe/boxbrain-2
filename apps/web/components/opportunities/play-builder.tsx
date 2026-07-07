import { Eye, GitCompareArrows, GripVertical, Presentation } from "lucide-react";
import { Card } from "@/components/ui";
import { matchTone, playBuilderContent, playBuilderSections } from "@/features/opportunities/data";

export function PlayBuilder() {
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="opportunity-play-builder">
      <Card className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--ai)]">Play Builder</div>
            <b className="text-xs">Global Expansion Framework</b>
            <div className="text-[11px] text-slate-500">Artifact Pack: ACME Executive Briefing · Draft</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-xs" aria-disabled="true" title="Preview is illustrative in this preview">
              <Eye size={11} aria-hidden="true" /> Preview
            </button>
            <button type="button" className="btn btn-ghost btn-xs" aria-disabled="true" title="Compare is illustrative in this preview">
              <GitCompareArrows size={11} aria-hidden="true" /> Compare
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-b border-[var(--line-soft)] py-2 text-[11px]">
          <StepBadge index={1} label="Build" active />
          <span className="text-slate-300">──</span>
          <StepBadge index={2} label="Review" />
          <span className="text-slate-300">──</span>
          <StepBadge index={3} label="Finalize" />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <b className="text-xs">
            Sections <span className="font-normal text-slate-400">(drag to reorder)</span>
          </b>
        </div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {playBuilderSections.map((section, index) => (
            <div key={section.title} className={`flow-step compact ${section.active ? "active" : ""}`}>
              <GripVertical size={12} color="var(--ink-4)" aria-hidden="true" />
              <span className="flow-num sm">{index + 1}</span>
              <div className="flex-1">
                <div className="text-xs font-medium">{section.title}</div>
                <div className="text-[10px] text-slate-400">{section.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-xs">
            Content <span className="font-normal text-slate-400">({playBuilderContent.length} items)</span>
          </b>
        </div>
        {playBuilderContent.map((item, index) => (
          <div key={item.title} className={`flex items-center gap-2 py-1.5 ${index < playBuilderContent.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}>
            <GripVertical size={11} color="var(--ink-4)" aria-hidden="true" />
            <span className="file-icon ppt xs">
              <Presentation size={9} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-xs">
              <div className="truncate font-medium text-slate-900">{item.title}</div>
              <div className="text-slate-500">{item.detail}</div>
            </div>
            <span className={`match-score sm ${matchTone(item.match)}`}>{item.match}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function StepBadge({ index, label, active }: { index: number; label: string; active?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-semibold"
        style={{ background: active ? "var(--primary)" : "var(--line-2)", color: active ? "#fff" : "var(--ink-3)" }}
      >
        {index}
      </span>
      <span className={active ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</span>
    </span>
  );
}
