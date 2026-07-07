import Link from "next/link";
import { Card, EmptyState, ScorePill } from "@/components/ui";
import { Badge } from "@/components/ui";
import type { FlatVersion } from "@/features/content-units/lib";
import { formatDate, normalizeScore, scoreDescriptor, versionBadge } from "@/features/content-units/lib";
import { ContentPreview } from "./content-preview";

export function VersionsTab({ pageId, entries, selectedVersionId }: { pageId: string; entries: FlatVersion[]; selectedVersionId?: string }) {
  if (entries.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState title="No versions returned" body="The API did not return any version history for this ContentUnit family." />
      </div>
    );
  }

  const byVariant = new Map<string, { label: string; entries: FlatVersion[] }>();
  for (const entry of entries) {
    const existing = byVariant.get(entry.variant.id);
    if (existing) existing.entries.push(entry);
    else byVariant.set(entry.variant.id, { label: entry.variant.variantLabel, entries: [entry] });
  }

  return (
    <div className="mt-5 grid gap-5">
      {Array.from(byVariant.values()).map((group) => (
        <div key={group.label}>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            {group.label}
            <span className="count-inline">{group.entries.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {group.entries.map(({ variant, version }) => {
              const isCurrent = version.id === selectedVersionId;
              const badge = versionBadge(variant, version);
              const quality = normalizeScore(version.qualityScore);
              return (
                <Card key={version.id} className={isCurrent ? "border-[var(--primary)]" : undefined}>
                  <Link href={isCurrent ? `/content-units/${pageId}?tab=versions` : `/content-units/${pageId}?tab=versions&version=${version.id}`} className="block p-3">
                    <ContentPreview title={version.summary ?? version.versionNumber} previewUri={version.thumbnailUri ?? version.renderUri} />
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge kind={badge.tone}>{badge.label}</Badge>
                      {isCurrent && <span className="badge primary">Current</span>}
                    </div>
                    <div className="mt-1.5 text-xs">
                      <div className="font-bold text-[var(--ink)]">{version.versionNumber}</div>
                      <div className="muted">{formatDate(version.createdAt)}</div>
                    </div>
                    {quality != null && (
                      <div className="mt-1.5">
                        <ScorePill value={quality} label={scoreDescriptor(quality, "quality")} />
                      </div>
                    )}
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
