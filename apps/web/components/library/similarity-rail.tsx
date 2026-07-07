"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import Link from "next/link";
import { Card, ScorePill, SlideThumb, Tag } from "@/components/ui";
import { boxbrainApi, type SearchResultItem } from "@/lib/api";
import { slideThumbVariant, toPercent } from "@/features/library/format";
import type { LoadState } from "@/features/library/types";

export function SimilarityPreviewRail({
  basisTitle,
  basisSubtitle,
  versionId
}: {
  basisTitle?: string;
  basisSubtitle?: string;
  versionId?: string | null;
}) {
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!versionId) {
      setItems([]);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    boxbrainApi
      .listSimilarContentUnits(versionId)
      .then((results) => {
        if (cancelled) return;
        setItems(results);
        setState(results.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  return (
    <Card className="sticky top-4 p-4" data-testid="library-similarity-rail">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <b className="text-[13px]">Similarity Preview</b>
          <Info size={12} className="text-[var(--ink-4)]" aria-hidden="true" />
        </div>
      </div>

      {!basisTitle ? (
        <p className="m-0 mt-1 text-xs text-[var(--ink-4)]">Expand a family in the list to preview its similar content here.</p>
      ) : (
        <>
          <div className="text-[11px] text-[var(--ink-3)]">
            Based on: <b className="text-[var(--ink-2)]">{basisTitle}</b>
            {basisSubtitle ? ` (${basisSubtitle})` : ""}
          </div>

          <div className="palette-group-label mt-3.5" style={{ paddingLeft: 0 }}>
            Top similar content
          </div>

          {!versionId && (
            <p className="m-0 text-xs text-[var(--ink-4)]">This family has no resolvable variant version yet, so similarity cannot be looked up.</p>
          )}
          {state === "loading" && (
            <div className="grid gap-2" aria-label="Loading similarity preview">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded bg-[var(--bg-2)]" />
              ))}
            </div>
          )}
          {state === "error" && <p className="m-0 text-xs text-[var(--danger)]">Similarity data could not be loaded for this content unit.</p>}
          {state === "empty" && (
            <p className="m-0 text-xs text-[var(--ink-4)]">No similarity edges recorded for this content unit yet. Similarity never implies shared family membership.</p>
          )}
          {state === "ready" &&
            items.slice(0, 5).map((item) => (
              <Link
                key={item.objectId}
                href={`/content-units/${item.objectId}`}
                className="flex items-center gap-2 border-b border-dashed border-[var(--line-soft)] py-2 last:border-0"
              >
                <div className="h-9 w-[54px] shrink-0 overflow-hidden rounded">
                  <SlideThumb title={item.title} variant={slideThumbVariant(item.objectId)} chart={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{item.title}</div>
                  {item.summary && <div className="truncate text-[10px] text-[var(--ink-4)]">{item.summary}</div>}
                  <div className="mt-1 flex gap-1">
                    {(item.explanationChips ?? []).slice(0, 2).map((chip) => (
                      <Tag key={chip} size="sm">
                        {chip}
                      </Tag>
                    ))}
                  </div>
                </div>
                <ScorePill value={toPercent(item.score)} label="" />
              </Link>
            ))}
          {state === "ready" && items.length > 5 && (
            <div className="mt-3 flex items-center justify-center rounded-lg bg-[var(--bg-2)] p-2 text-xs font-semibold text-[var(--primary)]">
              {items.length - 5} more similar item{items.length - 5 === 1 ? "" : "s"} not shown
            </div>
          )}
        </>
      )}
    </Card>
  );
}
