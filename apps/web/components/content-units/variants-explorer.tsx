import Link from "next/link";
import { Kbd, SlideThumb } from "@/components/ui";
import type { FlatVersion } from "@/features/content-units/lib";
import { normalizeScore, titleCase, versionBadge } from "@/features/content-units/lib";

const TONE_BG: Record<string, string> = {
  primary: "var(--primary-bg)",
  ok: "var(--ok-bg)",
  ai: "var(--ai-bg)",
  warn: "var(--warn-bg)",
  danger: "var(--danger-bg)",
  neutral: "var(--bg-2)"
};
const TONE_FG: Record<string, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  ai: "var(--ai)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  neutral: "var(--ink-3)"
};

export function VariantsExplorer({
  pageId,
  entries,
  selectedVersionId,
  variationExplorerHref
}: {
  pageId: string;
  entries: FlatVersion[];
  selectedVersionId?: string;
  variationExplorerHref: string;
}) {
  const legend = new Map<string, { count: number; tone: string }>();
  for (const entry of entries) {
    const badge = versionBadge(entry.variant, entry.version);
    const existing = legend.get(badge.label);
    legend.set(badge.label, { count: (existing?.count ?? 0) + 1, tone: badge.tone });
  }

  const visible = entries.slice(0, 5);

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-sm">Variants Explorer</b>
        <div className="muted flex items-center gap-1 text-[11px]">
          Use <Kbd>←</Kbd> <Kbd>→</Kbd> to browse siblings
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map(({ variant, version }) => {
          const badge = versionBadge(variant, version);
          const score = normalizeScore(version.qualityScore);
          const isCurrent = version.id === selectedVersionId;
          const tags = [badge.label, titleCase(version.approvalState), variant.variantType ? titleCase(variant.variantType) : null].filter(
            (value): value is string => Boolean(value)
          );
          return (
            <Link key={version.id} href={`/content-units/${pageId}?version=${version.id}`} className={`compare-card block ${isCurrent ? "current" : ""}`}>
              <SlideThumb title={variant.variantLabel} chart={false} variant="light" />
              <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[var(--ink)]">{variant.variantLabel}</div>
              {score != null && <div className="muted text-[9px]">{score}%</div>}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag sm" style={{ background: TONE_BG[legend.get(badge.label)?.tone ?? "neutral"], color: TONE_FG[legend.get(badge.label)?.tone ?? "neutral"] }}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px]">
        {Array.from(legend.entries()).map(([label, info]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: TONE_FG[info.tone] }} />
            {label} ({info.count})
          </span>
        ))}
        <span className="muted">{entries.length} total versions</span>
      </div>
      <Link href={variationExplorerHref} className="link mt-2 flex items-center gap-1 text-xs">
        Open full Variation Explorer
      </Link>
    </div>
  );
}
