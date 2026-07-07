import Link from "next/link";
import { Badge, SlideThumb } from "@/components/ui";
import type { FlatVersion } from "@/features/content-units/lib";
import { formatDate, versionBadge } from "@/features/content-units/lib";

export function VersionsRail({
  entries,
  selectedVersionId,
  pageId,
  versionsHref,
  limit = 5
}: {
  entries: FlatVersion[];
  selectedVersionId?: string;
  pageId: string;
  versionsHref: string;
  limit?: number;
}) {
  const visible = entries.slice(0, limit);
  return (
    <div>
      <div className="palette-group-label pl-0">Versions / History</div>
      <div className="grid gap-2">
        {visible.map(({ variant, version }) => {
          const isCurrent = version.id === selectedVersionId;
          const badge = versionBadge(variant, version);
          return (
            <Link
              key={version.id}
              href={isCurrent ? `/content-units/${pageId}` : `/content-units/${pageId}?version=${version.id}`}
              className="card block p-2"
              style={
                isCurrent
                  ? { borderColor: "var(--primary)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--primary) 15%, transparent)" }
                  : undefined
              }
              aria-current={isCurrent ? "true" : undefined}
            >
              <div className="aspect-video w-full overflow-hidden rounded">
                <SlideThumb title={version.summary ?? version.versionNumber} variant={isCurrent ? "light" : "dark"} chart={false} className="h-full w-full" />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <Badge kind={badge.tone}>{badge.label}</Badge>
              </div>
              <div className="mt-1 text-[11px]">
                <div className="font-bold text-[var(--ink)]">
                  {version.versionNumber} {isCurrent && <span className="muted font-normal">Current</span>}
                </div>
                <div className="muted">{formatDate(version.createdAt)}</div>
              </div>
            </Link>
          );
        })}
      </div>
      {entries.length > 0 && (
        <Link className="link mt-2 inline-block text-xs" href={versionsHref}>
          View all {entries.length} version{entries.length === 1 ? "" : "s"} →
        </Link>
      )}
    </div>
  );
}
