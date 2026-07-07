import { describe, expect, it } from "vitest";

import { buildVariationStack, normalizeSimilarityScore, partitionWhereUsed } from "./lib";
import type { ContentUnitVariant, ContentUnitVersion, ContentUnitWhereUsedReference } from "@/lib/api";

describe("normalizeSimilarityScore", () => {
  it("normalizes fractional and percentage scores", () => {
    expect(normalizeSimilarityScore(0.98)).toBe(98);
    expect(normalizeSimilarityScore(82)).toBe(82);
  });

  it("clamps empty and malformed scores", () => {
    expect(normalizeSimilarityScore(1.4)).toBe(1);
    expect(normalizeSimilarityScore(140)).toBe(100);
    expect(normalizeSimilarityScore(-20)).toBe(0);
    expect(normalizeSimilarityScore("0.9")).toBe(0);
    expect(normalizeSimilarityScore(Number.NaN)).toBe(0);
  });
});

describe("buildVariationStack", () => {
  it("orders selected variant, sibling variants, and prior versions distinctly", () => {
    const selectedLatest = version({ id: "version-3", variantId: "variant-clean", versionNumber: "v3", createdAt: "2024-04-24T12:00:00Z" });
    const selectedPrior = version({ id: "version-2", variantId: "variant-clean", versionNumber: "v2", createdAt: "2024-04-20T12:00:00Z" });
    const darkLatest = version({ id: "version-dark", variantId: "variant-dark", versionNumber: "v1", createdAt: "2024-04-22T12:00:00Z" });
    const items = buildVariationStack({
      variants: [
        variant({ id: "variant-dark", familyId: "family-1", variantLabel: "Executive Dark", isCanonical: false, latestVersion: darkLatest }),
        variant({ id: "variant-clean", familyId: "family-1", variantLabel: "Clean", isCanonical: true, latestVersion: selectedLatest })
      ],
      versionsByVariant: {
        "variant-clean": [selectedLatest, selectedPrior],
        "variant-dark": [darkLatest]
      },
      selectedVariantId: "variant-clean",
      selectedVersionId: "version-3"
    });

    expect(items.map((item) => [item.kind, item.id, item.badge, item.isCurrent])).toEqual([
      ["variant", "variant-clean", "Canonical", true],
      ["variant", "variant-dark", "Executive Dark", false],
      ["prior_version", "version-2", "Prior Version", false]
    ]);
  });

  it("marks a selected prior version as current", () => {
    const latest = version({ id: "version-3", variantId: "variant-clean", versionNumber: "v3", createdAt: "2024-04-24T12:00:00Z" });
    const prior = version({ id: "version-2", variantId: "variant-clean", versionNumber: "v2", createdAt: "2024-04-20T12:00:00Z" });
    const items = buildVariationStack({
      variants: [variant({ id: "variant-clean", familyId: "family-1", variantLabel: "Clean", isCanonical: true, latestVersion: latest })],
      versionsByVariant: { "variant-clean": [latest, prior] },
      selectedVariantId: "variant-clean",
      selectedVersionId: "version-2"
    });

    expect(items.find((item) => item.id === "variant-clean")?.isCurrent).toBe(false);
    expect(items.find((item) => item.id === "version-2")?.isCurrent).toBe(true);
  });

  it("handles empty and malformed version groups", () => {
    const items = buildVariationStack({
      variants: [variant({ id: "variant-empty", familyId: "family-1", variantLabel: "No versions", isCanonical: false, latestVersion: null })],
      versionsByVariant: {},
      selectedVariantId: "variant-empty",
      selectedVersionId: undefined
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "variant",
      id: "variant-empty",
      caption: "No versions returned",
      isCurrent: false
    });
  });
});

describe("partitionWhereUsed", () => {
  it("partitions known reference object types", () => {
    const partitions = partitionWhereUsed([
      reference({ objectType: "play", objectId: "play-1" }),
      reference({ objectType: "work_product_version", objectId: "work-1" }),
      reference({ objectType: "workproduct", objectId: "work-2" }),
      reference({ objectType: "storyboard", objectId: "story-1" }),
      reference({ objectType: "content_block_version", objectId: "block-1" }),
      reference({ objectType: "unknown", objectId: "other-1" })
    ]);

    expect(partitions.plays).toHaveLength(1);
    expect(partitions.workProducts.map((item) => item.objectId)).toEqual(["work-1", "work-2"]);
    expect(partitions.storyboards).toHaveLength(1);
    expect(partitions.contentBlocks).toHaveLength(1);
    expect(partitions.other).toHaveLength(1);
  });

  it("returns empty buckets for an empty input", () => {
    expect(partitionWhereUsed([])).toEqual({
      plays: [],
      workProducts: [],
      storyboards: [],
      contentBlocks: [],
      other: []
    });
  });
});

function variant(input: Partial<ContentUnitVariant> & { id: string; familyId: string; variantLabel: string; isCanonical: boolean }): ContentUnitVariant {
  return {
    variantType: "style",
    variantDimensions: {},
    linkedBy: "manual",
    linkedConfidence: null,
    latestVersionId: input.latestVersion?.id ?? null,
    latestVersion: input.latestVersion ?? null,
    ...input
  };
}

function version(input: Partial<ContentUnitVersion> & { id: string; variantId: string; versionNumber: string }): ContentUnitVersion {
  return {
    renderUri: null,
    thumbnailUri: null,
    summary: null,
    approvalState: "approved",
    freshnessState: "fresh",
    qualityScore: null,
    usageScore: null,
    sourceOrderIndex: null,
    createdAt: "2024-04-01T12:00:00Z",
    ...input
  };
}

function reference(input: Partial<ContentUnitWhereUsedReference> & { objectType: string; objectId: string }): ContentUnitWhereUsedReference {
  return {
    title: input.objectId,
    ...input
  };
}
