import { describe, expect, it } from "vitest";
import type { Comment, ContentUnitVariant, ContentUnitVersion } from "@/lib/api";
import {
  buildActivityTimeline,
  countVariantsByLinkSource,
  findFilmstripPosition,
  flattenVersionGroups,
  groupCommentsIntoThreads,
  normalizeScore,
  primaryParentReference,
  scoreDescriptor,
  scoreTone,
  taxonomyTags,
  versionBadge,
  whereUsedKind
} from "./lib";

function makeVariant(overrides: Partial<ContentUnitVariant> = {}): ContentUnitVariant {
  return {
    id: "variant-1",
    familyId: "family-1",
    variantLabel: "Clean",
    isCanonical: false,
    linkedBy: "manual",
    ...overrides
  };
}

function makeVersion(overrides: Partial<ContentUnitVersion> = {}): ContentUnitVersion {
  return {
    id: "version-1",
    variantId: "variant-1",
    versionNumber: "v1.0",
    approvalState: "draft",
    createdAt: "2024-04-24T12:00:00Z",
    ...overrides
  };
}

describe("normalizeScore", () => {
  it("returns null when the API did not return a score", () => {
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore(null)).toBeNull();
  });

  it("scales a 0-1 fraction up to a 0-100 integer", () => {
    expect(normalizeScore(0.96)).toBe(96);
  });

  it("passes an already 0-100 value through, clamped", () => {
    expect(normalizeScore(150)).toBe(100);
    expect(normalizeScore(87)).toBe(87);
  });
});

describe("scoreTone", () => {
  it("buckets scores using the default 85/70 thresholds", () => {
    expect(scoreTone(92)).toBe("good");
    expect(scoreTone(75)).toBe("mid");
    expect(scoreTone(40)).toBe("low");
  });
});

describe("scoreDescriptor", () => {
  it("derives a label from the score, not a separate field", () => {
    expect(scoreDescriptor(96, "quality")).toBe("Excellent");
    expect(scoreDescriptor(83, "usage")).toBe("Moderate");
    expect(scoreDescriptor(40, "relevance")).toBe("Loosely relevant");
  });
});

describe("versionBadge", () => {
  it("prefers Canonical when the variant is canonical", () => {
    expect(versionBadge(makeVariant({ isCanonical: true }), makeVersion())).toEqual({ label: "Canonical", tone: "primary" });
  });

  it("falls back to Approved when the version is approved", () => {
    expect(versionBadge(makeVariant(), makeVersion({ approvalState: "approved" }))).toEqual({ label: "Approved", tone: "ok" });
  });

  it("surfaces AI-linked when the variant was linked by AI", () => {
    expect(versionBadge(makeVariant({ linkedBy: "ai" }), makeVersion())).toEqual({ label: "AI-linked", tone: "ai" });
  });

  it("falls back to the raw approval state when nothing else applies", () => {
    expect(versionBadge(undefined, makeVersion({ approvalState: "review" }))).toEqual({ label: "Review", tone: "warn" });
  });
});

describe("taxonomyTags", () => {
  it("flattens and dedupes tag arrays across taxonomy facets", () => {
    expect(
      taxonomyTags({
        offerings: ["Cloud"],
        tags: ["cloud", "roi"],
        technologies: ["Cloud"]
      })
    ).toEqual(["Cloud", "cloud", "roi"]);
  });

  it("returns an empty array when no taxonomy was returned", () => {
    expect(taxonomyTags(undefined)).toEqual([]);
  });
});

describe("whereUsedKind", () => {
  it("maps known object types to real labels", () => {
    expect(whereUsedKind("work_product_version")).toEqual({ label: "Work Product", color: "var(--primary)" });
    expect(whereUsedKind("content_block_version")).toEqual({ label: "Content Block", color: "var(--ai)" });
  });

  it("falls back to a title-cased label for unknown types", () => {
    expect(whereUsedKind("some_other_type")).toEqual({ label: "Some Other Type", color: "var(--ink-3)" });
  });
});

describe("flattenVersionGroups", () => {
  it("flattens groups and sorts newest first", () => {
    const groups = [
      {
        variant: makeVariant({ id: "v1" }),
        versions: [makeVersion({ id: "old", createdAt: "2024-01-01T00:00:00Z" }), makeVersion({ id: "new", createdAt: "2024-06-01T00:00:00Z" })]
      }
    ];
    const flat = flattenVersionGroups(groups);
    expect(flat.map((entry) => entry.version.id)).toEqual(["new", "old"]);
  });
});

describe("countVariantsByLinkSource", () => {
  it("buckets variants by canonical/manual/ai/hybrid", () => {
    const variants = [
      makeVariant({ id: "a", isCanonical: true }),
      makeVariant({ id: "b", linkedBy: "ai" }),
      makeVariant({ id: "c", linkedBy: "hybrid" }),
      makeVariant({ id: "d", linkedBy: "manual" })
    ];
    expect(countVariantsByLinkSource(variants)).toEqual({ canonical: 1, manual: 1, ai: 1, hybrid: 1, total: 4 });
  });
});

describe("findFilmstripPosition", () => {
  const filmstrip = [makeVersion({ id: "a" }), makeVersion({ id: "b" }), makeVersion({ id: "c" })];

  it("returns 1-indexed position and total when the version is present", () => {
    expect(findFilmstripPosition(filmstrip, "b")).toEqual({ index: 2, total: 3 });
  });

  it("returns null when the version is not present", () => {
    expect(findFilmstripPosition(filmstrip, "missing")).toBeNull();
  });

  it("returns null when no filmstrip was returned", () => {
    expect(findFilmstripPosition(undefined, "a")).toBeNull();
  });
});

describe("primaryParentReference", () => {
  it("prefers a work_product_version reference", () => {
    const refs = [
      { objectType: "content_block_version", objectId: "cb-1" },
      { objectType: "work_product_version", objectId: "wp-1" }
    ];
    expect(primaryParentReference(refs)?.objectId).toBe("wp-1");
  });

  it("falls back to the first reference when no work product is present", () => {
    const refs = [{ objectType: "content_block_version", objectId: "cb-1" }];
    expect(primaryParentReference(refs)?.objectId).toBe("cb-1");
  });
});

describe("buildActivityTimeline", () => {
  it("merges version/comment/note events sorted newest first", () => {
    const events = buildActivityTimeline({
      versions: [{ variant: makeVariant(), version: makeVersion({ createdAt: "2024-01-01T00:00:00Z" }) }],
      comments: [{ id: "c1", kind: "persistent_comment", targetType: "content_unit_version", targetId: "v1", anchor: {}, body: "hello", status: "open", createdAt: "2024-06-01T00:00:00Z" } as Comment],
      notes: [{ id: "n1", targetType: "content_unit_version", targetId: "v1", body: "note", noteType: "usage_guidance", isPinned: false, createdAt: "2024-03-01T00:00:00Z" }]
    });
    expect(events.map((event) => event.kind)).toEqual(["comment", "note", "version"]);
  });
});

describe("groupCommentsIntoThreads", () => {
  it("attaches replies to their parent comment", () => {
    const comments: Comment[] = [
      { id: "root", kind: "persistent_comment", targetType: "content_unit_version", targetId: "v1", anchor: {}, body: "root", status: "open", parentCommentId: null, createdAt: "2024-01-01T00:00:00Z" },
      { id: "reply", kind: "persistent_comment", targetType: "content_unit_version", targetId: "v1", anchor: {}, body: "reply", status: "open", parentCommentId: "root", createdAt: "2024-01-02T00:00:00Z" }
    ];
    const threads = groupCommentsIntoThreads(comments);
    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe("root");
    expect(threads[0].replies.map((reply) => reply.id)).toEqual(["reply"]);
  });
});
