import { describe, expect, it } from "vitest";
import type { SearchResultItem } from "@/lib/api";
import {
  buildSelectionItem,
  countByTab,
  filterByFreshness,
  itemsForTab,
  matchingVersionsLabel,
  objectTypesChipLabel,
  selectionTypeForItem,
  tabForItem
} from "./lib";

function item(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    objectType: "content_unit_family",
    objectId: "00000000-0000-4000-8000-000000000101",
    resultGrain: "family",
    title: "Market Opportunity Overview",
    summary: "Flagship market-sizing narrative.",
    previewUri: "/seed/thumbs/market-overview.png",
    score: 0.74,
    explanationChips: ["keyword match", "semantic match", "family rollup"],
    statusChips: { approvalState: "approved", freshnessState: "fresh", isCanonical: true, linkSource: "manual" },
    ...overrides
  };
}

describe("tabForItem / countByTab / itemsForTab", () => {
  const items = [
    item({ objectId: "1", resultGrain: "family" }),
    item({ objectId: "2", resultGrain: "work_product", objectType: "work_product_family" }),
    item({ objectId: "3", resultGrain: "block", objectType: "content_block_version" }),
    item({ objectId: "4", resultGrain: "variant" }),
    item({ objectId: "5", resultGrain: "version" })
  ];

  it("groups every ContentUnit grain (family/variant/version) into the slides tab", () => {
    expect(tabForItem({ resultGrain: "family" })).toBe("slides");
    expect(tabForItem({ resultGrain: "variant" })).toBe("slides");
    expect(tabForItem({ resultGrain: "version" })).toBe("slides");
    expect(tabForItem({ resultGrain: "work_product" })).toBe("workproducts");
    expect(tabForItem({ resultGrain: "block" })).toBe("blocks");
    expect(tabForItem({ resultGrain: "play" })).toBe("plays");
  });

  it("counts items per tab, with 'all' reflecting the full set", () => {
    expect(countByTab(items)).toEqual({ all: 5, slides: 3, blocks: 1, workproducts: 1, plays: 0 });
  });

  it("filters items down to a single tab, or returns everything for 'all'", () => {
    expect(itemsForTab(items, "all")).toHaveLength(5);
    expect(itemsForTab(items, "slides").map((entry) => entry.objectId)).toEqual(["1", "4", "5"]);
    expect(itemsForTab(items, "workproducts").map((entry) => entry.objectId)).toEqual(["2"]);
    expect(itemsForTab(items, "plays")).toEqual([]);
  });
});

describe("filterByFreshness", () => {
  const items = [
    item({ objectId: "1", statusChips: { approvalState: "approved", freshnessState: "fresh" } }),
    item({ objectId: "2", statusChips: { approvalState: "approved", freshnessState: "stale" } })
  ];

  it("passes every item through for 'any'", () => {
    expect(filterByFreshness(items, "any")).toHaveLength(2);
  });

  it("narrows to the requested freshness state", () => {
    expect(filterByFreshness(items, "fresh").map((entry) => entry.objectId)).toEqual(["1"]);
    expect(filterByFreshness(items, "stale").map((entry) => entry.objectId)).toEqual(["2"]);
  });
});

describe("selectionTypeForItem / buildSelectionItem", () => {
  it("maps result grains to the shared My Selection item types", () => {
    expect(selectionTypeForItem({ resultGrain: "family" })).toBe("contentunit");
    expect(selectionTypeForItem({ resultGrain: "variant" })).toBe("contentunit");
    expect(selectionTypeForItem({ resultGrain: "version" })).toBe("contentunit");
    expect(selectionTypeForItem({ resultGrain: "work_product" })).toBe("workproduct");
    expect(selectionTypeForItem({ resultGrain: "play" })).toBe("play");
    expect(selectionTypeForItem({ resultGrain: "block" })).toBe("asset");
  });

  it("builds a selection item carrying id/title/subtitle/thumb from the search result", () => {
    const selectionItem = buildSelectionItem(item());
    expect(selectionItem).toEqual({
      id: "00000000-0000-4000-8000-000000000101",
      type: "contentunit",
      title: "Market Opportunity Overview",
      subtitle: "ContentUnit family · approved",
      thumb: "/seed/thumbs/market-overview.png"
    });
  });
});

describe("matchingVersionsLabel", () => {
  it("finds a real 'N matching versions' chip without fabricating one", () => {
    expect(matchingVersionsLabel(["keyword match", "5 matching versions"])).toBe("5 matching versions");
    expect(matchingVersionsLabel(["keyword match", "family rollup"])).toBeNull();
    expect(matchingVersionsLabel(undefined)).toBeNull();
  });
});

describe("objectTypesChipLabel", () => {
  it("shows a plain label when nothing or everything is selected", () => {
    expect(objectTypesChipLabel([], 3)).toBe("Content type");
    expect(objectTypesChipLabel(["a", "b", "c"], 3)).toBe("Content type");
  });

  it("shows a count when the selection is a strict subset", () => {
    expect(objectTypesChipLabel(["a"], 3)).toBe("Content type (1)");
  });
});
