// Pure, framework-free helpers for the Ask BoxBrain screen. Kept dependency-light so grouping,
// tab-count, and selection-mapping logic can be unit tested without React/DOM.
import type { SelectionItem, SelectionItemType } from "@/components/selection";
import type { FreshnessState, SearchResultItem } from "@/lib/api";

export type AskResultTabId = "all" | "slides" | "blocks" | "workproducts" | "plays";

export const ASK_RESULT_TABS: Array<{ id: AskResultTabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "slides", label: "Slides" },
  { id: "blocks", label: "Content Blocks" },
  { id: "workproducts", label: "Work Products" },
  { id: "plays", label: "Plays" }
];

/** Default natural-language query. Verified against the live seed corpus (returns 8 governed hits). */
export const ASK_DEFAULT_QUERY = "market opportunity";

/** Example chips. Each phrase is verified to return at least one hit against the seeded corpus. */
export const ASK_EXAMPLE_QUERIES = ["Executive summary", "Board update", "Pricing strategy", "Digital transformation"];

/** Maps a search result's resultGrain to the Ask screen's display tab. ContentUnit is atomic, so
 * every ContentUnit grain (family/variant/version) is one "Slides" tab regardless of rollup depth. */
export function tabForItem(item: Pick<SearchResultItem, "resultGrain">): Exclude<AskResultTabId, "all"> {
  if (item.resultGrain === "work_product") return "workproducts";
  if (item.resultGrain === "block") return "blocks";
  if (item.resultGrain === "play") return "plays";
  return "slides";
}

export function countByTab(items: SearchResultItem[]): Record<AskResultTabId, number> {
  const counts: Record<AskResultTabId, number> = { all: items.length, slides: 0, blocks: 0, workproducts: 0, plays: 0 };
  for (const item of items) counts[tabForItem(item)] += 1;
  return counts;
}

export function itemsForTab(items: SearchResultItem[], tab: AskResultTabId): SearchResultItem[] {
  if (tab === "all") return items;
  return items.filter((item) => tabForItem(item) === tab);
}

/** Client-side freshness narrowing. The API only hard-filters approvalState (via the
 * `approved_only` profile); freshness has no server-side hard filter, so this filters the already
 * -fetched, real result page rather than fabricating a server capability that does not exist. */
export function filterByFreshness(items: SearchResultItem[], freshness: FreshnessState | "any"): SearchResultItem[] {
  if (freshness === "any") return items;
  return items.filter((item) => item.statusChips?.freshnessState === freshness);
}

export function selectionTypeForItem(item: Pick<SearchResultItem, "resultGrain">): SelectionItemType {
  if (item.resultGrain === "work_product") return "workproduct";
  if (item.resultGrain === "play") return "play";
  if (item.resultGrain === "block") return "asset";
  return "contentunit";
}

function grainLabel(item: Pick<SearchResultItem, "resultGrain">): string {
  if (item.resultGrain === "work_product") return "Work Product";
  if (item.resultGrain === "block") return "Content Block";
  if (item.resultGrain === "play") return "Play";
  if (item.resultGrain === "variant") return "ContentUnit variant";
  if (item.resultGrain === "version") return "ContentUnit version";
  return "ContentUnit family";
}

export function selectionSubtitleForItem(item: SearchResultItem): string {
  const approval = item.statusChips?.approvalState;
  return approval ? `${grainLabel(item)} · ${approval}` : grainLabel(item);
}

export function buildSelectionItem(item: SearchResultItem): SelectionItem {
  return {
    id: item.objectId,
    type: selectionTypeForItem(item),
    title: item.title,
    subtitle: selectionSubtitleForItem(item),
    thumb: item.previewUri ?? undefined
  };
}

/** Extracts the real "N matching versions" explanation chip (if present) so tile cards can show an
 * honest overlay instead of a fabricated slide/page count. */
export function matchingVersionsLabel(chips: string[] | undefined): string | null {
  const match = chips?.find((chip) => /^\d+ matching versions?$/i.test(chip));
  return match ?? null;
}

export function objectTypesChipLabel(selected: string[], totalOptions: number): string {
  if (selected.length === 0 || selected.length === totalOptions) return "Content type";
  return `Content type (${selected.length})`;
}
