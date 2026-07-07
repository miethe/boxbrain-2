import clsx from "clsx";
import { HelpCircle } from "lucide-react";
import { scoreTone, type ScoreTone } from "@/features/content-units/lib";

const CIRCLE_TONE_BG: Record<ScoreTone, string> = {
  good: "var(--ok)",
  mid: "var(--warn)",
  low: "var(--danger)"
};

/**
 * Matches routes_2.jsx's local `ScorePillRow` (a solid numbered circle + stacked label/description),
 * which is a distinct visual from the shared `ScorePill` pill-shape component in ui.tsx. `globals.css`
 * has no standalone `.score-circle` class to port, so the circle is composed from Tailwind utilities
 * + CSS variables instead of adding a new global class.
 */
export function ScorePillRow({ value, label, description }: { value: number; label: string; description: string }) {
  const tone = scoreTone(value, { good: 90, mid: 80 });
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
        style={{ background: CIRCLE_TONE_BG[tone] }}
        aria-label={`Score ${value} of 100`}
      >
        {value}
      </span>
      <div className="min-w-0 flex-1 text-xs">
        <div className="font-semibold text-[var(--ink)]">{label}</div>
        <div className="muted">{description}</div>
      </div>
    </div>
  );
}

/** Honest "not available" twin of ScorePillRow for scores the API does not return (e.g. relevance). */
export function ScorePillRowUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className={clsx("flex items-center gap-2.5")} title={reason}>
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-dashed border-[var(--line-2)] text-[11px] font-bold text-[var(--ink-4)]" aria-hidden="true">
        <HelpCircle size={14} />
      </span>
      <div className="min-w-0 flex-1 text-xs">
        <div className="font-semibold text-[var(--ink)]">{label}</div>
        <div className="muted">Not available yet</div>
      </div>
    </div>
  );
}
