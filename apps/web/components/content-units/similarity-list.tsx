import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui";
import type { SearchResultItem } from "@/lib/api";
import { normalizeScore } from "@/features/content-units/lib";

export function SimilarityList({ items, limit }: { items: SearchResultItem[]; limit?: number }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No similarity edges returned"
        body="Domain rule: similarity never implies shared family membership on its own. When BoxBrain finds related content, it will appear here as a candidate for human review."
      />
    );
  }
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <div>
      {visible.map((item, index) => {
        const score = normalizeScore(item.score);
        return (
          <Link
            key={`${item.objectType}-${item.objectId}`}
            href={`/content-units/${item.objectId}`}
            className={`flex items-center gap-3 py-2 text-xs hover:bg-[var(--bg-2)] ${index < visible.length - 1 ? "border-b border-dashed border-[var(--line-soft)]" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-[var(--ink)]">{item.title}</div>
              <div className="muted mono truncate text-[10px]">
                {item.objectId.slice(0, 12)}
                {item.summary ? ` · ${item.summary}` : ""}
              </div>
              {item.statusChips && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.statusChips.isRestricted && <StatusBadge tone="danger">restricted</StatusBadge>}
                  {item.statusChips.isCanonical && <StatusBadge tone="ok">canonical</StatusBadge>}
                </div>
              )}
            </div>
            <b className="shrink-0 text-[var(--ink)]">{score ?? "—"}%</b>
          </Link>
        );
      })}
    </div>
  );
}
