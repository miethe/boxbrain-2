import Link from "next/link";
import { Boxes } from "lucide-react";
import type { ContentUnitWhereUsedReference } from "@/lib/api";
import { whereUsedKind } from "@/features/content-units/lib";

function referenceHref(item: ContentUnitWhereUsedReference) {
  if (item.objectType === "storyboard" || item.objectType === "storyboard_snapshot") return `/storyboards/${item.objectId}`;
  if (item.objectType === "content_block_version") return `/content-blocks/${item.objectId}`;
  if (item.objectType === "work_product_version") return `/work-products/${item.objectId}`;
  return "/library";
}

export function WhereUsedGrid({ items }: { items: ContentUnitWhereUsedReference[] }) {
  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--line-2)] p-4 text-center text-sm text-[var(--ink-3)]">Not used in any other object yet.</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.slice(0, 5).map((item) => {
        const kind = whereUsedKind(item.objectType);
        return (
          <Link
            key={`${item.objectType}-${item.objectId}`}
            href={referenceHref(item)}
            className="card block p-2.5 text-xs transition hover:border-[var(--line-2)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-2">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                style={{ background: `color-mix(in oklab, ${kind.color} 14%, white)`, color: kind.color }}
                aria-hidden="true"
              >
                <Boxes size={13} />
              </span>
              <b className="min-w-0 flex-1 truncate">{item.title ?? item.objectId}</b>
            </div>
            <div className="muted mt-2 truncate">{kind.label}</div>
          </Link>
        );
      })}
    </div>
  );
}

export function WhereUsedList({ items, limit = 3 }: { items: ContentUnitWhereUsedReference[]; limit?: number }) {
  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-sm text-[var(--ink-3)]">Not used in any other object yet.</div>;
  }
  const visible = items.slice(0, limit);
  const remaining = items.length - visible.length;
  return (
    <div>
      {visible.map((item, index) => {
        const kind = whereUsedKind(item.objectType);
        return (
          <Link
            key={`${item.objectType}-${item.objectId}`}
            href={referenceHref(item)}
            className={`flex items-center gap-2 py-2 text-xs hover:bg-[var(--bg-2)] ${index < visible.length - 1 ? "border-b border-dashed border-[var(--line-soft)]" : ""}`}
          >
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-md"
              style={{ background: `color-mix(in oklab, ${kind.color} 14%, white)`, color: kind.color }}
              aria-hidden="true"
            >
              <Boxes size={10} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-[var(--ink)]">{item.title ?? item.objectId}</div>
              <div className="muted truncate text-[10px]">{kind.label}</div>
            </div>
          </Link>
        );
      })}
      {remaining > 0 && <div className="muted mt-1 text-[11px]">+{remaining} more</div>}
    </div>
  );
}
