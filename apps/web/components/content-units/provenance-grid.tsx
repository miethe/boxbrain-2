import { Tag } from "@/components/ui";
import type { ContentUnitVersion, ProvenanceRecord } from "@/lib/api";
import { formatDate, titleCase, type SlidePosition } from "@/features/content-units/lib";

export function ProvenanceGrid({
  provenance,
  version,
  slidePosition,
  tags
}: {
  provenance?: ProvenanceRecord;
  version?: ContentUnitVersion;
  slidePosition?: SlidePosition | null;
  tags: string[];
}) {
  const source = provenance?.sourceRefs?.length ? provenance.sourceRefs.join(" · ") : provenance?.sourceSystem ?? provenance?.originType;

  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-xs">
      <div className="muted">Source</div>
      <div className="text-[var(--ink)]">{source ?? "Not returned"}</div>

      {slidePosition && (
        <>
          <div className="muted">Slide #</div>
          <div className="text-[var(--ink)]">
            {slidePosition.index} of {slidePosition.total}
          </div>
        </>
      )}

      <div className="muted">Created</div>
      <div className="text-[var(--ink)]">{formatDate(provenance?.createdAt ?? version?.createdAt)}</div>

      <div className="muted">Last modified</div>
      <div className="text-[var(--ink)]">{formatDate(version?.createdAt)}</div>

      {provenance && (
        <>
          <div className="muted">Imported</div>
          <div className="text-[var(--ink)]">
            {formatDate(provenance.createdAt)} via {provenance.sourceSystem ? titleCase(provenance.sourceSystem) : titleCase(provenance.originType)}
          </div>
        </>
      )}

      <div className="muted">Tags</div>
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? <span className="muted">No tags</span> : tags.slice(0, 6).map((tag) => <Tag key={tag} tone="blue" size="sm">{tag}</Tag>)}
      </div>
    </div>
  );
}
