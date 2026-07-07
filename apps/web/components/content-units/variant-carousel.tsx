"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Eye, Grid3x3, List } from "lucide-react";
import { CarouselRail } from "./carousel-rail";
import { Badge, SlideThumb } from "@/components/ui";
import { useMySelection } from "@/components/selection";
import type { Tone } from "@/features/content-units/lib";

export type CarouselCard = {
  id: string;
  href: string;
  title: string;
  thumbVariant: "dark" | "light" | "teal" | "purple";
  badgeLabel: string;
  badgeTone: Tone;
  matchScore: number | null;
  isCurrent: boolean;
  createdAt?: string;
  selectionId?: string;
  selectionSubtitle?: string;
};

function matchTone(score: number) {
  if (score >= 85) return "good";
  if (score >= 70) return "mid";
  return "low";
}

export function VariantCarousel({ cards, ariaLabel }: { cards: CarouselCard[]; ariaLabel: string }) {
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<"relevance" | "newest">("relevance");
  const { toggle, has } = useMySelection();

  const sorted = useMemo(() => {
    if (sort === "relevance") return cards;
    return [...cards].sort((left, right) => dateValue(right.createdAt) - dateValue(left.createdAt));
  }, [cards, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / 5));

  if (cards.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--line-2)] p-4 text-center text-sm text-[var(--ink-3)]">No variants or similar versions were returned.</div>;
  }

  const items = sorted.map((card) => <Card key={card.id} card={card} onBookmark={toggle} isBookmarked={card.selectionId ? has(card.selectionId) : false} />);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        <label className="muted flex items-center gap-1 text-xs">
          Sort by:
          <select
            className="rounded-md border border-[var(--line)] bg-white px-1.5 py-1 text-xs font-semibold text-[var(--ink)]"
            value={sort}
            onChange={(event) => setSort(event.target.value as "relevance" | "newest")}
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <button type="button" className={`icon-btn ${view === "grid" ? "border-[var(--primary-border)] bg-[var(--primary-bg)] text-[var(--primary)]" : ""}`} aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
          <Grid3x3 size={14} aria-hidden="true" />
        </button>
        <button type="button" className={`icon-btn ${view === "list" ? "border-[var(--primary-border)] bg-[var(--primary-bg)] text-[var(--primary)]" : ""}`} aria-pressed={view === "list"} aria-label="List (carousel) view" onClick={() => setView("list")}>
          <List size={14} aria-hidden="true" />
        </button>
      </div>

      {view === "list" ? (
        <CarouselRail ariaLabel={ariaLabel}>
          {sorted.map((card) => (
            <div key={card.id} role="listitem" className="w-[190px] shrink-0" style={{ scrollSnapAlign: "start" }}>
              <Card card={card} onBookmark={toggle} isBookmarked={card.selectionId ? has(card.selectionId) : false} />
            </div>
          ))}
        </CarouselRail>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items}</div>
      )}

      {view === "list" && (
        <div className="mt-3 flex items-center justify-center gap-1" aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? "var(--primary)" : "var(--line-2)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  card,
  onBookmark,
  isBookmarked
}: {
  card: CarouselCard;
  onBookmark: (item: { id: string; type: "contentunit"; title: string; subtitle?: string }) => void;
  isBookmarked: boolean;
}) {
  return (
    <div className={`compare-card ${card.isCurrent ? "current" : ""}`}>
      <Link href={card.href} className="relative block">
        <SlideThumb title={card.title} variant={card.thumbVariant} chart={false} />
        {card.matchScore != null && (
          <span className={`match-score sm ${matchTone(card.matchScore)} absolute left-1.5 top-1.5`}>{card.matchScore}</span>
        )}
      </Link>
      <div className="px-1 pb-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge kind={card.badgeTone}>{card.badgeLabel}</Badge>
          {card.isCurrent && <span className="badge primary">Current</span>}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[var(--ink-3)]">
          <Link href={card.href} aria-label={`View ${card.title}`} className="icon-btn borderless h-6 w-6">
            <Eye size={11} aria-hidden="true" />
          </Link>
          {card.selectionId && (
            <button
              type="button"
              className="icon-btn borderless h-6 w-6"
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? `Remove ${card.title} from My Selection` : `Add ${card.title} to My Selection`}
              onClick={() => onBookmark({ id: card.selectionId as string, type: "contentunit", title: card.title, subtitle: card.selectionSubtitle })}
            >
              {isBookmarked ? <BookmarkCheck size={11} aria-hidden="true" /> : <Bookmark size={11} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function dateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
