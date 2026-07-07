import Link from "next/link";
import { GitBranch, Network } from "lucide-react";
import type { ContentUnitWhereUsedReference, SearchResultItem } from "@/lib/api";
import { WhereUsedList } from "./where-used-list";
import { SimilarityList } from "./similarity-list";

/**
 * Domain rule: composition (where this ContentUnit is used) and similarity (content that merely
 * resembles it) are distinct relationship types, so they are always rendered as two clearly labeled
 * subsections rather than merged into one generic "relationships" list.
 */
export function RelationshipsPanel({
  whereUsed,
  similar,
  similarHref
}: {
  whereUsed: ContentUnitWhereUsedReference[];
  similar: SearchResultItem[];
  similarHref: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-3)]">
          <GitBranch size={13} aria-hidden="true" /> Used in (composition) <span className="count-inline">{whereUsed.length}</span>
        </div>
        <WhereUsedList items={whereUsed} limit={8} />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-3)]">
          <Network size={13} aria-hidden="true" /> Similar to (not shared family) <span className="count-inline">{similar.length}</span>
        </div>
        <SimilarityList items={similar} limit={5} />
        <Link href={similarHref} className="link mt-2 inline-block text-xs">
          View full Similar tab
        </Link>
      </div>
    </div>
  );
}
