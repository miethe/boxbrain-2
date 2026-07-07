import type { ApprovalState, ContentBlockVersionDetail, ContentUnitFamilyCard, ContentUnitVariant, StatusChips, WorkProductFamilyCard } from "@/lib/api";

export type LibraryTabId = "all" | "workProducts" | "contentUnits" | "plays" | "collections";

export type LibraryViewMode = "grid" | "list";

export type FamilyMode = "families" | "variants";

export type CatalogItemKind = "content_unit_family" | "work_product_family" | "content_block";

/**
 * A normalized card shape used by the "All" / "Work Products" catalog grid so the same
 * card renderer can present ContentUnit families, WorkProduct families, and ContentBlocks
 * side by side without fabricating fields the API does not provide.
 *
 * ContentBlockVersionDetail has no `statusChips`/taxonomy at all, so `statusChips` stays
 * optional and `approvalState` is tracked separately rather than inventing a full StatusChips
 * object for blocks.
 */
export type UnifiedCatalogItem = {
  key: string;
  kind: CatalogItemKind;
  id: string;
  title: string;
  summary?: string | null;
  previewUri?: string | null;
  unitType: string;
  tags: string[];
  variantCount?: number;
  versionCount?: number;
  approvalState?: ApprovalState;
  statusChips?: StatusChips;
  href: string;
  source: ContentUnitFamilyCard | WorkProductFamilyCard | ContentBlockVersionDetail;
};

/**
 * Sidecar metadata kept alongside a shared `SelectionItem` (id === ContentUnitVariant id) so the
 * "Add to Storyboard" write action can resolve a real content_unit_version id. This is in-memory
 * only (not persisted like the shared My Selection store), so items re-hydrated from localStorage
 * on a fresh page load may be missing an entry until the family is re-expanded in this session.
 */
export type ContentUnitSelectionMeta = {
  familyId: string;
  familyTitle: string;
  variantLabel: string;
  versionId?: string | null;
};

/** A staged entry inside the query-driven search-results compare tray (scoped to that view only). */
export type SearchSelectionEntry = {
  key: string;
  objectId: string;
  objectType: string;
  title: string;
  score: number;
  previewUri?: string | null;
  statusChips?: StatusChips;
};

export type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "restricted";

export type ExpandedVariantRow = ContentUnitVariant & {
  versionCount?: number | null;
  versionCountState: "idle" | "loading" | "ready" | "error";
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type ContentUnitFacets = {
  contentType: FacetOption[];
  useCase: FacetOption[];
  industry: FacetOption[];
  persona: FacetOption[];
  tags: FacetOption[];
  locale: FacetOption[];
  trust: FacetOption[];
};

export type ContentUnitFilterState = {
  contentType: string[];
  useCase: string[];
  industry: string[];
  persona: string[];
  tags: string[];
  locale: string[];
  trust: string[];
};

export const emptyContentUnitFilters: ContentUnitFilterState = {
  contentType: [],
  useCase: [],
  industry: [],
  persona: [],
  tags: [],
  locale: [],
  trust: []
};

export function countActiveFilters(filters: ContentUnitFilterState): number {
  return Object.values(filters).reduce((total, values) => total + values.length, 0);
}

export type CatalogFilterState = {
  kind: string[];
  trust: string[];
  taxonomy: string[];
};

export const emptyCatalogFilters: CatalogFilterState = {
  kind: [],
  trust: [],
  taxonomy: []
};

export function countCatalogFilters(filters: CatalogFilterState): number {
  return filters.kind.length + filters.trust.length + filters.taxonomy.length;
}
