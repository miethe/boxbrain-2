import type { ContentUnitVariant, ContentUnitVersion, ContentUnitWhereUsedReference } from "@/lib/api";

export type VariationStackItem =
  | {
      kind: "variant";
      id: string;
      variantId: string;
      familyId: string;
      versionId?: string;
      title: string;
      subtitle: string;
      caption: string;
      badge: string;
      badgeTone: "ok" | "warn";
      previewUri?: string | null;
      summary?: string | null;
      version?: ContentUnitVersion | null;
      isCurrent: boolean;
    }
  | {
      kind: "prior_version";
      id: string;
      variantId: string;
      familyId?: string;
      versionId: string;
      title: string;
      subtitle: string;
      caption: string;
      badge: "Prior Version";
      badgeTone: "primary";
      previewUri?: string | null;
      summary?: string | null;
      version: ContentUnitVersion;
      isCurrent: boolean;
    };

export type WhereUsedPartitions = {
  plays: ContentUnitWhereUsedReference[];
  workProducts: ContentUnitWhereUsedReference[];
  storyboards: ContentUnitWhereUsedReference[];
  contentBlocks: ContentUnitWhereUsedReference[];
  other: ContentUnitWhereUsedReference[];
};

export function normalizeSimilarityScore(score: unknown): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  const normalized = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export function buildVariationStack({
  variants,
  versionsByVariant,
  selectedVariantId,
  selectedVersionId
}: {
  variants: ContentUnitVariant[];
  versionsByVariant: Record<string, ContentUnitVersion[] | undefined>;
  selectedVariantId?: string;
  selectedVersionId?: string;
}): VariationStackItem[] {
  const orderedVariants = orderVariants(variants, selectedVariantId);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? orderedVariants[0];
  const selectedVariantVersions = selectedVariant ? sortedVersions(versionsByVariant[selectedVariant.id]) : [];
  const selectedLatest = selectedVariant ? latestVersion(selectedVariant, selectedVariantVersions) : undefined;

  const variantItems: VariationStackItem[] = orderedVariants.map((variant) => {
    const versions = sortedVersions(versionsByVariant[variant.id]);
    const latest = latestVersion(variant, versions);
    const label = variant.isCanonical ? "Canonical" : titleCase(variant.variantLabel || variant.variantType || "Variant");
    const descriptor = variant.variantLabel || variant.variantType || "Variant";
    const caption = latest ? `${latest.versionNumber} · ${formatShortDate(latest.createdAt)}` : "No versions returned";

    return {
      kind: "variant",
      id: variant.id,
      variantId: variant.id,
      familyId: variant.familyId,
      versionId: latest?.id,
      title: descriptor,
      subtitle: variant.isCanonical ? `${descriptor} (Canonical)` : descriptor,
      caption,
      badge: label,
      badgeTone: variant.isCanonical ? "ok" : "warn",
      previewUri: latest?.thumbnailUri ?? latest?.renderUri ?? null,
      summary: latest?.summary ?? null,
      version: latest ?? null,
      isCurrent: Boolean(latest?.id && latest.id === selectedVersionId)
    };
  });

  const priorItems: VariationStackItem[] = selectedVariantVersions
    .filter((version) => version.id !== selectedLatest?.id)
    .map((version) => ({
      kind: "prior_version" as const,
      id: version.id,
      variantId: version.variantId,
      familyId: selectedVariant?.familyId,
      versionId: version.id,
      title: selectedVariant?.variantLabel || "Prior version",
      subtitle: version.summary ?? selectedVariant?.variantLabel ?? "Prior version",
      caption: `${version.versionNumber} · ${formatShortDate(version.createdAt)}`,
      badge: "Prior Version" as const,
      badgeTone: "primary" as const,
      previewUri: version.thumbnailUri ?? version.renderUri ?? null,
      summary: version.summary ?? null,
      version,
      isCurrent: version.id === selectedVersionId
    }));

  return [...variantItems, ...priorItems];
}

export function partitionWhereUsed(items: ContentUnitWhereUsedReference[]): WhereUsedPartitions {
  return items.reduce<WhereUsedPartitions>(
    (partitions, item) => {
      const type = item.objectType?.toLowerCase();
      if (type === "play") {
        partitions.plays.push(item);
      } else if (type === "work_product" || type === "workproduct" || type === "work_product_version") {
        partitions.workProducts.push(item);
      } else if (type === "storyboard" || type === "storyboard_version" || type === "storyboard_snapshot") {
        partitions.storyboards.push(item);
      } else if (type === "content_block_version" || type === "content_block") {
        partitions.contentBlocks.push(item);
      } else {
        partitions.other.push(item);
      }
      return partitions;
    },
    { plays: [], workProducts: [], storyboards: [], contentBlocks: [], other: [] }
  );
}

function orderVariants(variants: ContentUnitVariant[], selectedVariantId?: string) {
  return [...variants].sort((left, right) => {
    if (left.id === selectedVariantId) return -1;
    if (right.id === selectedVariantId) return 1;
    if (left.isCanonical !== right.isCanonical) return left.isCanonical ? -1 : 1;
    return left.variantLabel.localeCompare(right.variantLabel);
  });
}

function sortedVersions(versions?: ContentUnitVersion[]) {
  return [...(versions ?? [])].sort((left, right) => dateValue(right.createdAt) - dateValue(left.createdAt));
}

function latestVersion(variant: ContentUnitVariant, versions: ContentUnitVersion[]) {
  if (variant.latestVersion) return variant.latestVersion;
  if (variant.latestVersionId) return versions.find((version) => version.id === variant.latestVersionId) ?? versions[0];
  return versions[0];
}

function dateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatShortDate(value?: string) {
  if (!value) return "undated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "undated";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
