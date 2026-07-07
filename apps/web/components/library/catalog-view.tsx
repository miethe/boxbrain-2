"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Filter, Grid2X2, Layers, List, Presentation, Save, Star, Table2 } from "lucide-react";
import { Card, EmptyState, IconButton, StatusBadge, Tag } from "@/components/ui";
import type { ContentBlockVersionDetail, ContentUnitFamilyCard, WorkProductFamilyCard } from "@/lib/api";
import { approvalTone, assetUrl, fileIconToneFor, freshnessTone, healthBucketFor, slideThumbVariant, taxonomyTags } from "@/features/library/format";
import { emptyCatalogFilters, countCatalogFilters, type CatalogFilterState, type CatalogItemKind, type FacetOption, type LibraryViewMode, type UnifiedCatalogItem } from "@/features/library/types";

const kindLabels: Record<CatalogItemKind, string> = {
  content_unit_family: "Content Unit",
  work_product_family: "Work Product",
  content_block: "Content Block"
};

const kindIcons: Record<CatalogItemKind, typeof Presentation> = {
  content_unit_family: Presentation,
  work_product_family: FileText,
  content_block: Layers
};

function buildUnifiedItems(options: {
  scope: "all" | "workProducts";
  families: ContentUnitFamilyCard[];
  workProducts: WorkProductFamilyCard[];
  contentBlocks: ContentBlockVersionDetail[];
}): UnifiedCatalogItem[] {
  const { scope, families, workProducts, contentBlocks } = options;
  const items: UnifiedCatalogItem[] = [];

  if (scope === "all") {
    for (const family of families) {
      items.push({
        key: `family-${family.id}`,
        kind: "content_unit_family",
        id: family.id,
        title: family.familyTitle,
        summary: family.conceptualSummary,
        previewUri: family.canonicalPreviewUri,
        unitType: family.unitType,
        tags: taxonomyTags(family.taxonomy, 3),
        variantCount: family.variantCount,
        versionCount: family.versionCount,
        approvalState: family.statusChips?.approvalState,
        statusChips: family.statusChips,
        href: `/content-units/${family.id}`,
        source: family
      });
    }
    for (const block of contentBlocks) {
      items.push({
        key: `block-${block.id}`,
        kind: "content_block",
        id: block.id,
        title: block.title,
        summary: block.summary,
        previewUri: null,
        unitType: "content_block",
        tags: [],
        variantCount: undefined,
        versionCount: block.members.length,
        approvalState: block.approvalState,
        statusChips: undefined,
        href: `/content-blocks/${block.id}`,
        source: block
      });
    }
  }

  for (const workProduct of workProducts) {
    items.push({
      key: `wp-${workProduct.id}`,
      kind: "work_product_family",
      id: workProduct.id,
      title: workProduct.title,
      summary: workProduct.summary,
      previewUri: workProduct.previewUri,
      unitType: workProduct.artifactType,
      tags: [],
      variantCount: workProduct.variantCount,
      versionCount: workProduct.versionCount,
      approvalState: workProduct.statusChips?.approvalState,
      statusChips: workProduct.statusChips,
      href: `/work-products/${workProduct.id}`,
      source: workProduct
    });
  }

  return items;
}

function computeCatalogFacets(items: UnifiedCatalogItem[]) {
  const kindCounts = new Map<CatalogItemKind, number>();
  const trustCounts = { trusted: 0, review: 0, outdated: 0 };
  const taxonomyCounts = new Map<string, number>();
  for (const item of items) {
    kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + 1);
    trustCounts[healthBucketFor(item.statusChips ?? (item.approvalState ? { approvalState: item.approvalState, freshnessState: "fresh" } : undefined))] += 1;
    for (const tag of item.tags) {
      taxonomyCounts.set(tag, (taxonomyCounts.get(tag) ?? 0) + 1);
    }
  }
  const kind: FacetOption[] = Array.from(kindCounts.entries()).map(([value, count]) => ({ value, label: kindLabels[value], count }));
  const trust: FacetOption[] = [
    { value: "trusted", label: "Trusted", count: trustCounts.trusted },
    { value: "review", label: "Needs Review", count: trustCounts.review },
    { value: "outdated", label: "Outdated", count: trustCounts.outdated }
  ];
  const taxonomy: FacetOption[] = Array.from(taxonomyCounts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { kind, trust, taxonomy };
}

export function CatalogView({
  scope,
  families,
  workProducts,
  contentBlocks
}: {
  scope: "all" | "workProducts";
  families: ContentUnitFamilyCard[];
  workProducts: WorkProductFamilyCard[];
  contentBlocks: ContentBlockVersionDetail[];
}) {
  const items = useMemo(() => buildUnifiedItems({ scope, families, workProducts, contentBlocks }), [scope, families, workProducts, contentBlocks]);
  const facets = useMemo(() => computeCatalogFacets(items), [items]);
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<"relevance" | "title">("relevance");
  const [view, setView] = useState<LibraryViewMode>("grid");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.kind.length > 0 && !filters.kind.includes(item.kind)) return false;
      if (filters.trust.length > 0) {
        const bucket = healthBucketFor(item.statusChips ?? (item.approvalState ? { approvalState: item.approvalState, freshnessState: "fresh" } : undefined));
        if (!filters.trust.includes(bucket)) return false;
      }
      if (filters.taxonomy.length > 0 && !item.tags.some((tag) => filters.taxonomy.includes(tag))) return false;
      return true;
    });
  }, [items, filters]);

  const sorted = useMemo(() => (sort === "title" ? [...filtered].sort((a, b) => a.title.localeCompare(b.title)) : filtered), [filtered, sort]);
  const activeCount = countCatalogFilters(filters);

  function toggle(category: keyof CatalogFilterState, value: string) {
    setFilters((prev) => {
      const current = prev[category];
      const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
      return { ...prev, [category]: next };
    });
  }

  function toggleFavorite(key: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div data-testid="library-catalog-view">
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={`chip ${activeCount > 0 || filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}>
          <Filter size={12} /> All Filters {activeCount > 0 && <span className="count-inline">{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button type="button" className="link" onClick={() => setFilters(emptyCatalogFilters)}>
            Clear all
          </button>
        )}
        <span className="flex-1" />
        <button type="button" className="link flex items-center gap-1" disabled title="Saved views require a backend endpoint that does not exist yet.">
          <Save size={12} /> Save view
        </button>
      </div>

      {filtersOpen && (
        <Card className="mt-3 p-3.5" data-testid="library-catalog-filters">
          <div className="flex flex-wrap gap-6">
            <FacetChips label="Object Type" options={facets.kind} active={filters.kind} onToggle={(value) => toggle("kind", value)} />
            <FacetChips label="Trust & Quality" options={facets.trust} active={filters.trust} onToggle={(value) => toggle("trust", value)} />
            <FacetChips label="Tags" options={facets.taxonomy} active={filters.taxonomy} onToggle={(value) => toggle("taxonomy", value)} />
          </div>
          {scope === "all" && (
            <p className="m-0 mt-3 text-[11px] text-[var(--ink-4)]">
              Tag facets only apply to Content Units — Work Products and Content Blocks do not carry the same taxonomy yet, so they will always be hidden once a tag
              filter is active.
            </p>
          )}
        </Card>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <b className="text-[15px]">{sorted.length} results</b>
          {activeCount > 0 && <span className="chip active text-[11px]">Filtered</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="select-wrap">
            <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as "relevance" | "title")}>
              <option value="relevance">Sort: Relevance</option>
              <option value="title">Sort: Title A-Z</option>
            </select>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
            <IconButton label="Grid view" borderless onClick={() => setView("grid")} style={view === "grid" ? { background: "var(--primary-bg)", color: "var(--primary)" } : undefined}>
              <Grid2X2 size={14} />
            </IconButton>
            <IconButton label="List view" borderless onClick={() => setView("list")} style={view === "list" ? { background: "var(--primary-bg)", color: "var(--primary)" } : undefined}>
              <List size={14} />
            </IconButton>
            <IconButton label="Table view (not yet available)" borderless disabled title="A dense table view is not implemented yet.">
              <Table2 size={14} />
            </IconButton>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No catalog items match" body="The live API returned items, but none satisfy the active filters. Clear a filter to see more results." />
        </div>
      ) : view === "grid" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="library-catalog-grid">
          {sorted.map((item) => (
            <UnifiedCard key={item.key} item={item} favorite={favorites.has(item.key)} onToggleFavorite={() => toggleFavorite(item.key)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-2" data-testid="library-catalog-list">
          {sorted.map((item) => (
            <UnifiedListRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FacetChips({ label, options, active, onToggle }: { label: string; options: FacetOption[]; active: string[]; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip ${active.includes(option.value) ? "active" : ""}`}
            onClick={() => onToggle(option.value)}
          >
            {option.label} <span className="count-inline">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UnifiedCard({ item, favorite, onToggleFavorite }: { item: UnifiedCatalogItem; favorite: boolean; onToggleFavorite: () => void }) {
  const preview = assetUrl(item.previewUri);
  const bucket = healthBucketFor(item.statusChips ?? (item.approvalState ? { approvalState: item.approvalState, freshnessState: "fresh" } : undefined));
  const iconTone = fileIconToneFor(item.kind === "content_unit_family" ? item.unitType : item.kind);

  return (
    <Card className="card-hoverable overflow-hidden" data-testid="library-catalog-card">
      <div className="relative">
        {preview ? (
          <div className="slide-thumb light bg-cover bg-center" style={{ backgroundImage: `url("${preview}")` }} role="img" aria-label={`${item.title} preview`}>
            <div className="slide-content bg-white/75">
              <div className="slide-brand">BB</div>
              <div className="slide-title">{item.title}</div>
            </div>
          </div>
        ) : (
          <div className={`slide-thumb ${slideThumbVariant(item.id)}`} role="img" aria-label={`${item.title} preview`}>
            <div className="slide-content">
              <div className="slide-brand">BB</div>
              <div className="slide-title">{item.title}</div>
            </div>
          </div>
        )}
        <span className="file-icon-badge">
          <span className={`file-icon ${iconTone}`}>
            <KindIcon item={item} size={10} />
          </span>
        </span>
        <button
          type="button"
          className="icon-btn borderless absolute right-1.5 top-1.5 bg-white/90"
          aria-label={favorite ? "Remove session favorite" : "Mark as session favorite"}
          onClick={onToggleFavorite}
        >
          <Star size={14} color={favorite ? "#f59e0b" : undefined} fill={favorite ? "#f59e0b" : "none"} />
        </button>
        {bucket === "trusted" && <span className="badge ok absolute bottom-1.5 left-1.5">Trusted</span>}
        <Link href={item.href} className="card-hover-show absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2 py-1 text-[11px] font-semibold text-white">
          Open <ChevronRight size={11} />
        </Link>
      </div>
      <div className="card-body">
        <Link href={item.href} className="text-[13px] font-bold leading-snug hover:text-[var(--primary)]">
          {item.title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1">
          <StatusBadge tone="neutral">{kindLabels[item.kind]}</StatusBadge>
          {item.approvalState && <StatusBadge tone={approvalTone(item.approvalState)}>{item.approvalState}</StatusBadge>}
          {item.statusChips?.freshnessState && <StatusBadge tone={freshnessTone(item.statusChips.freshnessState)}>{item.statusChips.freshnessState}</StatusBadge>}
        </div>
        {item.summary && <p className="m-0 mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--ink-4)]">{item.summary}</p>}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Tag key={tag} size="sm">
                {tag}
              </Tag>
            ))}
          </div>
        )}
        {(item.variantCount !== undefined || item.versionCount !== undefined) && (
          <div className="mt-2 text-[11px] text-[var(--ink-3)]">
            {item.variantCount !== undefined ? `${item.variantCount} variants · ` : ""}
            {item.versionCount ?? 0} versions
          </div>
        )}
      </div>
    </Card>
  );
}


function KindIcon({ item, size }: { item: UnifiedCatalogItem; size: number }) {
  const Icon = kindIcons[item.kind];
  return <Icon size={size} aria-hidden="true" />;
}

function UnifiedListRow({ item }: { item: UnifiedCatalogItem }) {
  return (
    <Link href={item.href} className="list-row" data-testid="library-catalog-row">
      <span className={`file-icon sm ${fileIconToneFor(item.kind === "content_unit_family" ? item.unitType : item.kind)}`}><KindIcon item={item} size={11} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--ink)]">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--ink-4)]">
          {kindLabels[item.kind]}
          {item.summary ? ` · ${item.summary}` : ""}
        </span>
      </span>
      {item.approvalState && <StatusBadge tone={approvalTone(item.approvalState)}>{item.approvalState}</StatusBadge>}
      {item.statusChips?.freshnessState && <StatusBadge tone={freshnessTone(item.statusChips.freshnessState)}>{item.statusChips.freshnessState}</StatusBadge>}
    </Link>
  );
}
