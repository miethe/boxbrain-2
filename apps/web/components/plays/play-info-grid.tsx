import { Clock, Flag, Target, Users } from "lucide-react";
import { Card } from "@/components/ui";
import type { PlayRecord } from "@/features/plays/data";

export function PlayInfoGrid({ play }: { play: PlayRecord }) {
  const blocks = [
    {
      icon: Users,
      color: "var(--primary)",
      title: "Intended Audience",
      body: (
        <>
          <div>{play.audience}</div>
          <div className="mt-1 text-slate-500">Experience: {play.experience}</div>
          <div className="text-slate-500">Deals: {play.dealSize}</div>
        </>
      )
    },
    {
      icon: Target,
      color: "var(--ok)",
      title: "Use Cases",
      body: (
        <ul className="m-0 list-disc pl-4 leading-relaxed">
          {play.useCases.map((useCase) => (
            <li key={useCase}>{useCase}</li>
          ))}
        </ul>
      )
    },
    { icon: Clock, color: "var(--warn)", title: "When to Use", body: <div>{play.whenToUse}</div> },
    { icon: Flag, color: "var(--ai)", title: "Success Criteria", body: <div>{play.successCriteria}</div> }
  ];

  return (
    <Card className="mt-3 overflow-hidden p-0" data-testid="play-info-grid">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {blocks.map((block, index) => (
          <div
            key={block.title}
            className={`p-4 text-xs leading-relaxed text-[var(--ink-2)] ${index < blocks.length - 1 ? "border-b border-[var(--line-soft)] xl:border-b-0 xl:border-r" : ""}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
                style={{ background: `color-mix(in oklab, ${block.color} 14%, white)`, color: block.color }}
              >
                <block.icon size={14} aria-hidden="true" />
              </span>
              <b className="text-[12.5px] text-slate-900">{block.title}</b>
            </div>
            {block.body}
          </div>
        ))}
      </div>
    </Card>
  );
}
