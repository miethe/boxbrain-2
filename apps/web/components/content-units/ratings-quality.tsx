import { ScorePill } from "@/components/ui";
import { normalizeScore, scoreDescriptor } from "@/features/content-units/lib";

export function RatingsQualityCard({ qualityScore, usageScore }: { qualityScore?: number | null; usageScore?: number | null }) {
  const quality = normalizeScore(qualityScore);
  const usage = normalizeScore(usageScore);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-2 text-xs">
      <div className="muted">Average rating</div>
      <div className="muted text-right italic">No ratings recorded yet</div>

      <div className="muted">Quality score</div>
      <div className="text-right">{quality == null ? <span className="muted italic">Not available</span> : <ScorePill value={quality} label={scoreDescriptor(quality, "quality")} />}</div>

      <div className="muted">Relevance</div>
      <div className="text-right">
        <span className="muted italic" title="No relevance-score field is returned by the ContentUnit version API yet.">
          Not available
        </span>
      </div>

      <div className="muted">Usage score</div>
      <div className="text-right">{usage == null ? <span className="muted italic">Not available</span> : <ScorePill value={usage} label={scoreDescriptor(usage, "usage")} />}</div>
    </div>
  );
}
