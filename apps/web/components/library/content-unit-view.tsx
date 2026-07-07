"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronDown, Filter, GitCompareArrows, Grid2X2, List, Link2, Plus, Sparkles } from "lucide-react";
import type { SelectionItem } from "@/components/selection";
import { BadgeCheck, Button, Card, EmptyState, IconButton, ListRow, SlideThumb, Tag } from "@/components/ui";
import { boxbrainApi, type ContentUnitFamilyCard, type ContentUnitVariant } from "@/lib/api";
import { assetUrl, confidenceLevel, formatDate, healthBucketFor, slideThumbVariant, taxonomyTags } from "@/features/library/format";
import {
  emptyContentUnitFilters,
  countActiveFilters,
  type ContentUnitFacets,
  type ContentUnitFilterState,
  type FacetOption,
  type FamilyMode,
  type LibraryViewMode,
  type LoadState
} from "@/features/library/types";

type VariantRowState = ContentUnitVariant & { versionCount: number | null; versionCountState: LoadState };

type FamilyVariantsState = {
  state: LoadState;
  variants: VariantRowState[];
};

type SortMode = "relevance" | "title" | "updated";

const activeToggleStyle: CSSProperties = { background: "var(--primary-bg)", color: "var(--primary)" };

export function ContentUnitLibraryView({
  families,
  onToggleSelect,
  onIsSelected,
  onBasisChange
}: {
  families: ContentUnitFamilyCard[];
  onToggleSelect: (item: SelectionItem, versionId: string | null | undefined) => void;
  onIsSelected: (selectionId: string) => boolean;
  onBasisChange: (basis: { title: string; subtitle?: string; versionId?: string | null }) => void;
}) {
  const [familyMode, setFamilyMode] = useState<FamilyMode>("families");
  const [view, setView] = useState<LibraryViewMode>("list");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContentUnitFilterState>(emptyContentUnitFilters);
  const [variantsByFamily, setVariantsByFamily] = useState<Record<string, FamilyVariantsState>>({});
  const [flattenState, setFlattenState] = useState<LoadState>("idle");

  const facets = useMemo(() => computeFacets(families), [families]);
  const filteredFamilies = useMemo(() => applyFilters(families, filters), [families, filters]);
  const sortedFamilies = useMemo(() => sortFamilies(filteredFamilies, sort), [filteredFamilies, sort]);
  const activeFilterCount = countActiveFilters(filters);
  const totalVariants = families.reduce((sum, family) => sum + (family.variantCount ?? 0), 0);
  const sortedFamilyIds = sortedFamilies.map((family) => family.id).join(",");

  function toggleFilterValue(category: keyof ContentUnitFilterState, value: string) {
    setFilters((prev) => {
      const current = prev[category];
      const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
      return { ...prev, [category]: next };
    });
  }

  function clearFilters() {
    setFilters(emptyContentUnitFilters);
  }

  async function loadVariantsFor(family: ContentUnitFamilyCard) {
    if (variantsByFamily[family.id]) return;
    setVariantsByFamily((prev) => ({ ...prev, [family.id]: { state: "loading", variants: [] } }));
    try {
      const envelope = await boxbrainApi.listContentUnitVariants(family.id);
      const rows: VariantRowState[] = envelope.items.map((variant) => ({ ...variant, versionCount: null, versionCountState: "loading" }));
      setVariantsByFamily((prev) => ({ ...prev, [family.id]: { state: rows.length ? "ready" : "empty", variants: rows } }));
      const canonical = envelope.items.find((variant) => variant.isCanonical) ?? envelope.items[0];
      if (canonical) {
        onBasisChange({ title: family.familyTitle, subtitle: canonical.variantLabel, versionId: canonical.latestVersionId });
      }
      rows.forEach((row) => {
        boxbrainApi
          .listContentUnitVersions(row.id)
          .then((versionEnvelope) => {
            setVariantsByFamily((prev) => {
              const current = prev[family.id];
              if (!current) return prev;
              return {
                ...prev,
                [family.id]: {
                  ...current,
                  variants: current.variants.map((v) => (v.id === row.id ? { ...v, versionCount: versionEnvelope.items.length, versionCountState: "ready" } : v))
                }
              };
            });
          })
          .catch(() => {
            setVariantsByFamily((prev) => {
              const current = prev[family.id];
              if (!current) return prev;
              return { ...prev, [family.id]: { ...current, variants: current.variants.map((v) => (v.id === row.id ? { ...v, versionCountState: "error" } : v)) } };
            });
          });
      });
    } catch {
      setVariantsByFamily((prev) => ({ ...prev, [family.id]: { state: "error", variants: [] } }));
    }
  }

  function handleExpand(family: ContentUnitFamilyCard) {
    const next = expandedFamilyId === family.id ? null : family.id;
    setExpandedFamilyId(next);
    if (next) void loadVariantsFor(family);
  }

  // "Show all variants" flattens every currently-filtered family's real variants into one list.
  const canFlatten = sortedFamilies.length > 0 && sortedFamilies.length <= 80;
  useEffect(() => {
    if (familyMode !== "variants" || !canFlatten) return;
    let cancelled = false;
    setFlattenState("loading");
    Promise.all(
      sortedFamilies.map((family) =>
        boxbrainApi
          .listContentUnitVariants(family.id)
          .then((envelope) => ({ family, variants: envelope.items }))
          .catch(() => ({ family, variants: [] as ContentUnitVariant[] }))
      )
    ).then((results) => {
      if (cancelled) return;
      setVariantsByFamily((prev) => {
        const next = { ...prev };
        for (const result of results) {
          next[result.family.id] = {
            state: result.variants.length ? "ready" : "empty",
            variants: result.variants.map((v) => ({ ...v, versionCount: null, versionCountState: "idle" }))
          };
        }
        return next;
      });
      setFlattenState("ready");
    });
    return () => {
      cancelled = true;
    };
    // sortedFamilies is intentionally summarized as sortedFamilyIds to avoid refetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyMode, canFlatten, sortedFamilyIds]);

  const flattenedVariants = useMemo(() => {
    if (familyMode !== "variants") return [];
    return sortedFamilies.flatMap((family) => (variantsByFamily[family.id]?.variants ?? []).map((variant) => ({ family, variant })));
  }, [familyMode, sortedFamilies, variantsByFamily]);

  return (
    <div data-testid="library-content-unit-view">
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`chip ${activeFilterCount > 0 ? "active" : ""}`}>
          <Filter size={12} /> Filters {activeFilterCount > 0 && <span className="count-inline">{activeFilterCount}</span>}
        </span>
        <div className="flex overflow-hidden rounded-md border border-[var(--line)]">
          <Button variant={familyMode === "families" ? "primary" : "default"} size="sm" style={{ borderRadius: 0, border: 0 }} onClick={() => setFamilyMode("families")}>
            Show families
          </Button>
          <Button variant={familyMode === "variants" ? "primary" : "default"} size="sm" style={{ borderRadius: 0, border: 0 }} onClick={() => setFamilyMode("variants")}>
            Show all variants
          </Button>
        </div>
        <div className="select-wrap">
          <select aria-label="Sort families" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="relevance">Sort: Relevance</option>
            <option value="title">Sort: Title A-Z</option>
            <option value="updated">Sort: Recently updated</option>
          </select>
        </div>
        <span className="flex-1" />
        <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
          <IconButton label="Grid view" borderless onClick={() => setView("grid")} style={view === "grid" ? activeToggleStyle : undefined}>
            <Grid2X2 size={14} />
          </IconButton>
          <IconButton label="List view" borderless onClick={() => setView("list")} style={view === "list" ? activeToggleStyle : undefined}>
            <List size={14} />
          </IconButton>
        </div>
        <span className="text-[13px] text-[var(--ink-3)]">
          <b className="text-[var(--ink)]">{families.length}</b> families <b className="ml-1.5 text-[var(--ink)]">{totalVariants}</b> variants
        </span>
        {activeFilterCount > 0 && (
          <button type="button" className="link" onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-5" style={{ gridTemplateColumns: "220px 1fr" }}>
        <FilterSidebar facets={facets} filters={filters} onToggle={toggleFilterValue} onClear={clearFilters} />

        <div data-testid="library-family-list">
          {families.length === 0 ? (
            <EmptyState title="No ContentUnit families returned" body="The Library API is reachable, but it did not return any visible family cards for this user and filter set." />
          ) : sortedFamilies.length === 0 ? (
            <EmptyState title="No families match these filters" body="Try clearing a filter — none of the loaded families satisfy every selected facet." />
          ) : familyMode === "families" ? (
            view === "list" ? (
              sortedFamilies.map((family) => (
                <FamilyRow
                  key={family.id}
                  family={family}
                  expanded={expandedFamilyId === family.id}
                  variantsState={variantsByFamily[family.id]}
                  onExpand={() => handleExpand(family)}
                  onToggleSelect={onToggleSelect}
                  onIsSelected={onIsSelected}
                  onBasisChange={onBasisChange}
                />
              ))
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedFamilies.map((family) => (
                  <FamilyGridCard key={family.id} family={family} />
                ))}
              </div>
            )
          ) : !canFlatten ? (
            <EmptyState
              title="Too many families to flatten at once"
              body={`Narrow your filters first — showing all variants across ${sortedFamilies.length} families would require too many parallel requests.`}
            />
          ) : flattenState === "loading" ? (
            <div className="grid gap-2" aria-label="Loading variants">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-lg bg-[var(--bg-2)]" />
              ))}
            </div>
          ) : flattenedVariants.length === 0 ? (
            <EmptyState title="No variants found" body="None of the currently visible families have variant records yet." />
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
              {flattenedVariants.map(({ family, variant }) => (
                <VariantCard
                  key={variant.id}
                  family={family}
                  variant={variant}
                  view={view}
                  selected={variant.latestVersionId ? onIsSelected(variant.latestVersionId) : false}
                  onToggleSelect={onToggleSelect}
                  onBasisChange={onBasisChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  facets,
  filters,
  onToggle,
  onClear
}: {
  facets: ContentUnitFacets;
  filters: ContentUnitFilterState;
  onToggle: (category: keyof ContentUnitFilterState, value: string) => void;
  onClear: () => void;
}) {
  const groups: Array<{ key: keyof ContentUnitFilterState; label: string; options: FacetOption[] }> = [
    { key: "contentType", label: "Content Type", options: facets.contentType },
    { key: "useCase", label: "Use Case", options: facets.useCase },
    { key: "industry", label: "Industry", options: facets.industry },
    { key: "persona", label: "Persona", options: facets.persona },
    { key: "tags", label: "Tags", options: facets.tags },
    { key: "locale", label: "Locale / Region", options: facets.locale }
  ];
  return (
    <Card className="self-start p-3.5" data-testid="library-filter-sidebar">
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-[11px] uppercase tracking-[0.05em] text-[var(--ink-3)]">Filter by</b>
        <button type="button" className="link text-[11px]" onClick={onClear}>
          Clear
        </button>
      </div>
      {groups.map((group) => (
        <FacetGroup key={group.key} label={group.label} options={group.options} active={filters[group.key]} onToggle={(value) => onToggle(group.key, value)} />
      ))}
      <div className="mb-2.5">
        <div className="mb-1.5 text-[11px] font-medium text-[var(--ink-3)]">Trust &amp; Quality</div>
        {facets.trust.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
            <input type="checkbox" checked={filters.trust.includes(option.value)} onChange={() => onToggle("trust", option.value)} />
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: option.value === "trusted" ? "var(--ok)" : option.value === "review" ? "var(--warn)" : "var(--danger)" }}
            />
            <span className="flex-1">{option.label}</span>
            <span className="text-[11px] text-[var(--ink-3)]">{option.count}</span>
          </label>
        ))}
      </div>
      <div className="text-[11px] text-[var(--ink-4)]">
        Content Owner and Locale ownership metadata are not yet exposed by the ContentUnit family API, so those facets are omitted rather than shown with fabricated
        values.
      </div>
    </Card>
  );
}

function FacetGroup({ label, options, active, onToggle }: { label: string; options: FacetOption[]; active: string[]; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="mb-2.5">
      <div className="mb-1.5 text-[11px] font-medium text-[var(--ink-3)]">{label}</div>
      <div className="grid gap-1">
        {options.slice(0, 6).map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={active.includes(option.value)} onChange={() => onToggle(option.value)} />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <span className="text-[11px] text-[var(--ink-3)]">{option.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FamilyRow({
  family,
  expanded,
  variantsState,
  onExpand,
  onToggleSelect,
  onIsSelected,
  onBasisChange
}: {
  family: ContentUnitFamilyCard;
  expanded: boolean;
  variantsState?: FamilyVariantsState;
  onExpand: () => void;
  onToggleSelect: (item: SelectionItem, versionId: string | null | undefined) => void;
  onIsSelected: (selectionId: string) => boolean;
  onBasisChange: (basis: { title: string; subtitle?: string; versionId?: string | null }) => void;
}) {
  const tags = taxonomyTags(family.taxonomy, 3);
  const extra = Math.max(0, taxonomyTags(family.taxonomy, 99).length - tags.length);
  const bucket = healthBucketFor(family.statusChips);

  return (
    <div data-testid="library-family-card" className="card mt-3 overflow-hidden" style={{ borderColor: expanded ? "var(--primary-border)" : undefined }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="grid cursor-pointer gap-5 p-4"
        style={{ gridTemplateColumns: "220px 1fr auto" }}
        onClick={onExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onExpand();
          }
        }}
      >
        <div className="overflow-hidden rounded-md">
          <SlideThumb title={family.familyTitle} variant={slideThumbVariant(family.id)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <b className="text-[15px]">{family.familyTitle}</b>
            {bucket === "trusted" && <BadgeCheck>Trusted</BadgeCheck>}
            {family.statusChips?.isRestricted && <span className="badge danger">restricted</span>}
          </div>
          <p className="m-0 mt-1 max-w-[60ch] text-xs text-[var(--ink-3)]">{family.conceptualSummary ?? "No conceptual summary returned for this family."}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.length === 0 ? <Tag>untagged</Tag> : tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            {extra > 0 && (
              <Tag size="sm">
                +{extra}
              </Tag>
            )}
          </div>
        </div>
        <div className="flex items-start gap-6 border-l border-[var(--line-soft)] pl-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--ink-3)]">Variants</div>
            <div className="text-[22px] font-bold tracking-tight">{family.variantCount ?? 0}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--ink-3)]">Versions</div>
            <div className="text-[22px] font-bold tracking-tight">{family.versionCount ?? 0}</div>
          </div>
          <ChevronDown size={16} className="mt-1 text-[var(--ink-3)] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[var(--line-soft)] bg-[var(--bg)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <b className="text-[13px]">
              Variants in this family <span className="count-inline">{family.variantCount ?? 0}</span>
            </b>
          </div>
          {!variantsState || variantsState.state === "loading" ? (
            <div className="grid gap-2 px-4 pb-4" aria-label="Loading variants">
              {[0, 1].map((row) => (
                <div key={row} className="h-10 animate-pulse rounded bg-[var(--bg-2)]" />
              ))}
            </div>
          ) : variantsState.state === "error" ? (
            <p className="m-0 px-4 pb-4 text-xs text-[var(--danger)]">Variants could not be loaded for this family.</p>
          ) : variantsState.variants.length === 0 ? (
            <p className="m-0 px-4 pb-4 text-xs text-[var(--ink-4)]">This family has no variant records yet.</p>
          ) : (
            <table className="tbl bg-[var(--paper)]">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Audience</th>
                  <th>Linked By</th>
                  <th>AI Confidence</th>
                  <th>Versions</th>
                  <th>Updated</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variantsState.variants.map((variant) => {
                  const confidence = confidenceLevel(variant.linkedConfidence ?? null);
                  const audienceValue = variant.variantDimensions?.audience;
                  const audience = typeof audienceValue === "string" ? audienceValue : variant.variantType ?? "—";
                  const versionId = variant.latestVersionId;
                  const selected = versionId ? onIsSelected(versionId) : false;
                  return (
                    <tr key={variant.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link href={`/content-units/${family.id}`} className="font-bold text-[var(--ink)] hover:text-[var(--primary)]">
                            {variant.variantLabel}
                          </Link>
                          {variant.isCanonical && <span className="badge info">Canonical</span>}
                        </div>
                      </td>
                      <td className="capitalize">{audience}</td>
                      <td>
                        <span className="flex items-center gap-1 text-xs">
                          <Link2 size={11} color={variant.linkedBy === "ai" ? "var(--ai)" : "var(--ink-3)"} />
                          {variant.linkedBy === "ai" ? "AI-Link" : "Manual-Link"}
                        </span>
                      </td>
                      <td>
                        {confidence ? (
                          <div className="flex items-center gap-2">
                            <b>{confidence.pct}%</b>
                            <span className="text-[11px] text-[var(--ink-3)]">{confidence.level}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--ink-4)]">—</span>
                        )}
                      </td>
                      <td>{variant.versionCountState === "loading" ? "…" : variant.versionCountState === "error" ? "—" : variant.versionCount ?? "—"}</td>
                      <td>{formatDate(variant.latestVersion?.createdAt) ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="link flex items-center gap-1 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBasisChange({ title: family.familyTitle, subtitle: variant.variantLabel, versionId: variant.latestVersionId });
                            }}
                          >
                            <Sparkles size={11} /> Similar
                          </button>
                          <button
                            type="button"
                            className="link flex items-center gap-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!versionId}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!versionId) return;
                              onToggleSelect(
                                {
                                  id: versionId,
                                  type: "contentunit",
                                  title: `${family.familyTitle} — ${variant.variantLabel}`,
                                  subtitle: variant.latestVersion?.versionNumber ?? undefined,
                                  thumb: assetUrl(variant.latestVersion?.thumbnailUri)
                                },
                                versionId
                              );
                            }}
                          >
                            {selected ? (
                              <>
                                <GitCompareArrows size={11} /> Selected
                              </>
                            ) : (
                              <>
                                <Plus size={11} /> Add
                              </>
                            )}
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function FamilyGridCard({ family }: { family: ContentUnitFamilyCard }) {
  const tags = taxonomyTags(family.taxonomy, 3);
  return (
    <Card className="card-hoverable overflow-hidden" data-testid="library-family-card">
      <SlideThumb title={family.familyTitle} variant={slideThumbVariant(family.id)} />
      <div className="card-body">
        <Link href={`/content-units/${family.id}`} className="text-sm font-bold hover:text-[var(--primary)]">
          {family.familyTitle}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.length === 0 ? (
            <Tag size="sm">untagged</Tag>
          ) : (
            tags.map((tag) => (
              <Tag key={tag} size="sm">
                {tag}
              </Tag>
            ))
          )}
        </div>
        <div className="mt-2 text-[11px] text-[var(--ink-3)]">
          {family.variantCount ?? 0} variants · {family.versionCount ?? 0} versions
        </div>
      </div>
    </Card>
  );
}

function VariantCard({
  family,
  variant,
  view,
  selected,
  onToggleSelect,
  onBasisChange
}: {
  family: ContentUnitFamilyCard;
  variant: ContentUnitVariant;
  view: LibraryViewMode;
  selected: boolean;
  onToggleSelect: (item: SelectionItem, versionId: string | null | undefined) => void;
  onBasisChange: (basis: { title: string; subtitle?: string; versionId?: string | null }) => void;
}) {
  const versionId = variant.latestVersionId;
  const selectionItem: SelectionItem | null = versionId
    ? {
        id: versionId,
        type: "contentunit",
        title: `${family.familyTitle} — ${variant.variantLabel}`,
        subtitle: variant.latestVersion?.versionNumber ?? undefined,
        thumb: assetUrl(variant.latestVersion?.thumbnailUri)
      }
    : null;
  if (view === "list") {
    return (
      <ListRow
        title={
          <>
            {family.familyTitle} <span className="font-normal text-[var(--ink-3)]">— {variant.variantLabel}</span>
          </>
        }
        sub={variant.latestVersion?.versionNumber ?? "no version"}
        right={
          <span className="flex items-center gap-2">
            {variant.isCanonical && <span className="badge info">Canonical</span>}
            <button
              type="button"
              className="link text-xs"
              onClick={() => onBasisChange({ title: family.familyTitle, subtitle: variant.variantLabel, versionId: variant.latestVersionId })}
            >
              Similar
            </button>
            <button type="button" className="btn btn-xs" disabled={!selectionItem} onClick={() => selectionItem && onToggleSelect(selectionItem, versionId)}>
              {selected ? "Selected" : "Add"}
            </button>
          </span>
        }
      />
    );
  }
  return (
    <Card className="card-hoverable overflow-hidden" data-testid="library-variant-row">
      <SlideThumb title={family.familyTitle} variant={slideThumbVariant(family.id)} />
      <div className="card-body">
        <div className="text-sm font-bold">{family.familyTitle}</div>
        <div className="text-xs text-[var(--ink-3)]">{variant.variantLabel}</div>
        <div className="mt-2 flex items-center justify-between">
          {variant.isCanonical ? <span className="badge info">Canonical</span> : <span />}
          <button type="button" className="btn btn-xs" disabled={!selectionItem} onClick={() => selectionItem && onToggleSelect(selectionItem, versionId)}>
            {selected ? "Selected" : "Add"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function computeFacets(families: ContentUnitFamilyCard[]): ContentUnitFacets {
  const contentType = tally(families.map((f) => f.unitType).filter(Boolean));
  const useCase = tally(families.flatMap((f) => f.taxonomy?.useCases ?? []));
  const industry = tally(families.flatMap((f) => f.taxonomy?.sectors ?? []));
  const persona = tally(families.flatMap((f) => f.taxonomy?.audiences ?? []));
  const tags = tally(families.flatMap((f) => f.taxonomy?.tags ?? []));
  const locale = tally(families.flatMap((f) => f.taxonomy?.locales ?? []));
  const trustCounts = families.reduce(
    (acc, family) => {
      acc[healthBucketFor(family.statusChips)] += 1;
      return acc;
    },
    { trusted: 0, review: 0, outdated: 0 } as Record<string, number>
  );
  return {
    contentType,
    useCase,
    industry,
    persona,
    tags,
    locale,
    trust: [
      { value: "trusted", label: "Trusted", count: trustCounts.trusted },
      { value: "review", label: "Needs Review", count: trustCounts.review },
      { value: "outdated", label: "Outdated", count: trustCounts.outdated }
    ]
  };
}

function tally(values: string[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);
}

function applyFilters(families: ContentUnitFamilyCard[], filters: ContentUnitFilterState): ContentUnitFamilyCard[] {
  return families.filter((family) => {
    if (filters.contentType.length > 0 && !filters.contentType.includes(family.unitType)) return false;
    if (filters.useCase.length > 0 && !intersects(family.taxonomy?.useCases, filters.useCase)) return false;
    if (filters.industry.length > 0 && !intersects(family.taxonomy?.sectors, filters.industry)) return false;
    if (filters.persona.length > 0 && !intersects(family.taxonomy?.audiences, filters.persona)) return false;
    if (filters.tags.length > 0 && !intersects(family.taxonomy?.tags, filters.tags)) return false;
    if (filters.locale.length > 0 && !intersects(family.taxonomy?.locales, filters.locale)) return false;
    if (filters.trust.length > 0 && !filters.trust.includes(healthBucketFor(family.statusChips))) return false;
    return true;
  });
}

function intersects(values: string[] | undefined, selected: string[]) {
  if (!values) return false;
  return values.some((value) => selected.includes(value));
}

function sortFamilies(families: ContentUnitFamilyCard[], sort: SortMode): ContentUnitFamilyCard[] {
  if (sort === "title") return [...families].sort((a, b) => a.familyTitle.localeCompare(b.familyTitle));
  if (sort === "updated") {
    return [...families].sort((a, b) => Number(b.statusChips?.freshnessState === "fresh") - Number(a.statusChips?.freshnessState === "fresh"));
  }
  return families;
}
