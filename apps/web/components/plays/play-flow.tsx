import { FileText, MoreHorizontal, Target, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui";
import type { PlayStep, PlayStepIcon } from "@/features/plays/data";

const stepIcon: Record<PlayStepIcon, typeof Users> = {
  meeting: Users,
  workproduct: Target,
  workshop: Zap,
  engagement: Target,
  proposal: FileText
};

const stepColor: Record<PlayStepIcon, string> = {
  meeting: "var(--primary)",
  workproduct: "var(--ok)",
  workshop: "var(--ai)",
  engagement: "var(--warn)",
  proposal: "var(--danger)"
};

const stepBadgeTone: Record<PlayStepIcon, "primary" | "ok" | "ai" | "warn" | "danger"> = {
  meeting: "primary",
  workproduct: "ok",
  workshop: "ai",
  engagement: "warn",
  proposal: "danger"
};

export function PlayFlow({ steps }: { steps: PlayStep[] }) {
  return (
    <div className="flex flex-col" data-testid="play-flow">
      {steps.map((step, index) => {
        const Icon = stepIcon[step.icon];
        const color = stepColor[step.icon];
        return (
          <div key={step.title} className="flow-step">
            <span className="flow-num">{index + 1}</span>
            <span className="flow-icon" style={{ background: `color-mix(in oklab, ${color} 12%, white)`, color }}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-[200px]">
              <div className="text-sm font-bold text-slate-900">{step.title}</div>
            </div>
            <Badge kind={stepBadgeTone[step.icon]}>{step.type}</Badge>
            <div className="flex-1 text-sm text-[var(--ink-2)]">{step.description}</div>
            <div className="whitespace-nowrap text-xs text-slate-500">{step.duration}</div>
            <button type="button" className="icon-btn borderless" aria-label="Step actions" aria-disabled="true">
              <MoreHorizontal size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
