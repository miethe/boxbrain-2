import type { ReviewCompareObject, ReviewTargetRef } from "@/lib/api";
import type { EnrichedTarget, VersionCacheEntry } from "./types";
import { targetVersionId } from "./target-ids";

/**
 * Merges the review API's thin compareObjects (title + versionId only, see audit-digest.md ##
 * reviews) with whatever the version-detail cache has loaded for each versionId, so the compare
 * workspace / decision rail / compare drawer can show real thumbnails, approval/freshness chips,
 * quality/usage scores, extracted text, and provenance without fabricating anything.
 */
export function buildEnrichedTargets(
  compareObjects: ReviewCompareObject[],
  cache: Record<string, VersionCacheEntry>
): EnrichedTarget[] {
  return compareObjects.map((object, index) => {
    const versionId = object.versionId ?? undefined;
    const entry = versionId ? cache[versionId] : undefined;
    const base: EnrichedTarget = {
      index,
      title: object.title ?? `Target ${index + 1}`,
      versionId,
      subtitle: object.subtitle ?? undefined,
      renderUri: object.renderUri ?? object.previewUri ?? undefined,
      thumbnailUri: object.thumbnailUri ?? undefined,
      summary: object.summary ?? undefined,
      extractedText: object.extractedText ?? undefined,
      isRestricted: Boolean(object.isRestricted || object.statusChips?.isRestricted),
      approvalState: object.statusChips?.approvalState,
      freshnessState: object.statusChips?.freshnessState,
      cacheStatus: entry?.status === "ready" ? "ready" : entry?.status === "restricted" ? "restricted" : entry?.status === "error" ? "error" : entry ? "loading" : "idle"
    };

    if (!entry || entry.status !== "ready") return base;
    const data = entry.data;
    return {
      ...base,
      variantId: data.variantId,
      renderUri: base.renderUri ?? data.renderUri ?? undefined,
      thumbnailUri: base.thumbnailUri ?? data.thumbnailUri ?? undefined,
      summary: base.summary ?? data.summary ?? undefined,
      extractedText: base.extractedText ?? data.extractedText ?? undefined,
      approvalState: base.approvalState ?? data.approvalState,
      freshnessState: base.freshnessState ?? data.freshnessState,
      qualityScore: data.qualityScore ?? undefined,
      usageScore: data.usageScore ?? undefined,
      createdAt: data.createdAt,
      versionNumber: data.versionNumber,
      provenance: data.provenance
    };
  });
}

/** Fallback when a ReviewItemDetail has no compareObjects but does have targetRefs. */
export function targetRefToCompareObject(target: ReviewTargetRef): ReviewCompareObject {
  return {
    title: target.title ?? target.id ?? target.versionId ?? "Review target",
    versionId: targetVersionId(target),
    familyId: target.familyId,
    variantId: target.variantId,
    isRestricted: target.isRestricted
  };
}
