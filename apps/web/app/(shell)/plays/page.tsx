import { Filter, Plus } from "lucide-react";
import { InfoBanner } from "@/components/ui";
import { PlaysCategoryTabs } from "@/components/plays/category-tabs";
import { PlayCard } from "@/components/plays/play-card";
import { getPlayCategoryCounts, getPlaysByCategory, type PlayCategory } from "@/features/plays/data";

const knownCategories: string[] = ["growth", "expansion", "cross-sell", "retention"];

export default async function PlaysPage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const query = (await searchParams) ?? {};
  const activeCategory = knownCategories.includes(query.category ?? "") ? (query.category as PlayCategory) : "all";
  const counts = getPlayCategoryCounts();
  const plays = getPlaysByCategory(activeCategory);

  return (
    <div className="route-body" data-testid="plays-page">
      <InfoBanner tone="ai">
        Plays is a preview surface backed by local seed data — there is no live Play catalog or governance workflow yet. Browsing is real; creation and edits are illustrative only.
      </InfoBanner>

      <div className="page-head-row mt-4">
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-slate-950">Plays</h1>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" aria-disabled="true" title="Filtering beyond categories is not available in this preview">
            <Filter size={13} aria-hidden="true" /> Filter
          </button>
          <button type="button" className="btn btn-primary btn-sm" aria-disabled="true" title="Play creation is not available in this preview">
            <Plus size={13} aria-hidden="true" /> New Play
          </button>
        </div>
      </div>

      <PlaysCategoryTabs active={activeCategory} counts={counts} />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="plays-grid">
        {plays.map((play) => (
          <PlayCard key={play.id} play={play} />
        ))}
      </div>
    </div>
  );
}
