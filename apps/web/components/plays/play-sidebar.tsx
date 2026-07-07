import Link from "next/link";
import { Archive, Copy, Download, Edit, FileText, Share2, Sparkles, Upload } from "lucide-react";
import { Card } from "@/components/ui";
import type { PlayRecord } from "@/features/plays/data";
import { PlayIcon } from "@/components/plays/play-icon";

const guidancePoints = [
  "Tailor this play for your account's industry and size.",
  "Review similar plays used in your region.",
  "Prepare a business case using the Expansion ROI Calculator."
];

const actions = [
  { icon: Copy, label: "Duplicate Play" },
  { icon: Edit, label: "Customize for My Team" },
  { icon: Upload, label: "Publish to Team" },
  { icon: Share2, label: "Share Play" },
  { icon: Download, label: "Export as PDF" }
];

export function PlaySidebar({ similarPlays }: { similarPlays: PlayRecord[] }) {
  return (
    <aside className="flex flex-col gap-3" data-testid="play-sidebar">
      <div className="ai-panel">
        <h4>
          <Sparkles size={14} aria-hidden="true" /> AI Guidance
          <span className="beta">BETA</span>
        </h4>
        <div className="ai-body">BoxBrain AI suggests key actions to maximize your success with this play. These prompts are illustrative in this preview.</div>
        <div className="mt-2 flex flex-col gap-1">
          {guidancePoints.map((point) => (
            <div key={point} className="ai-action">
              <FileText size={13} aria-hidden="true" />
              <span>{point}</span>
            </div>
          ))}
        </div>
        <Link href="/ask" className="btn btn-primary mt-3 w-full justify-between">
          <span className="flex items-center gap-2">
            <Sparkles size={12} aria-hidden="true" /> Ask BoxBrain
          </span>
        </Link>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-sm">Similar Plays</b>
          <Link href="/plays" className="text-xs font-semibold text-[var(--primary)]">
            See all
          </Link>
        </div>
        {similarPlays.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">No similar preview plays are linked yet.</p>
        ) : (
          similarPlays.map((play, index) => (
            <Link
              key={play.id}
              href={`/plays/${play.id}`}
              className={`flex items-center gap-3 py-2.5 ${index < similarPlays.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: play.gradient }}>
                <PlayIcon iconKey={play.iconKey} size={14} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate font-semibold text-slate-900">{play.title}</div>
                <div className="text-xs text-slate-500">
                  {play.stats.uses} uses
                </div>
              </div>
            </Link>
          ))
        )}
      </Card>

      <Card className="p-4">
        <b className="text-sm">Actions</b>
        <div className="mt-2 flex flex-col">
          {actions.map((action) => (
            <div key={action.label} className="flex items-center gap-2 border-b border-dashed border-slate-200 py-2 text-sm text-slate-700" aria-disabled="true">
              <action.icon size={13} color="var(--ink-3)" aria-hidden="true" />
              {action.label}
            </div>
          ))}
          <div className="flex items-center gap-2 py-2.5 text-sm text-[var(--danger)]" aria-disabled="true">
            <Archive size={13} aria-hidden="true" /> Archive Play
          </div>
        </div>
        <p className="m-0 mt-1 text-[11px] text-slate-400">Actions are illustrative in this preview and do not persist.</p>
      </Card>
    </aside>
  );
}
