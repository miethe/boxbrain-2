import { describe, expect, it } from "vitest";
import type { Comment, StoryboardDiagnosticWarning, StoryboardSection, StoryboardSlot } from "@/lib/api";
import {
  anchorLabel,
  anchorValue,
  approvalTone,
  breakdownWarnings,
  collectObjectRefs,
  commentsForSlot,
  commentsForStoryboardLevel,
  countGapSlots,
  countSlots,
  diffSnapshots,
  freshnessTone,
  groupCommentThreads,
  healthDescriptor,
  objectDetailKey,
  slotDetailFor,
  slotTitle,
  warningsForSection,
  warningsForSlot,
  type SlotObjectDetail
} from "./lib";

function slot(overrides: Partial<StoryboardSlot> = {}): StoryboardSlot {
  return {
    id: "slot-1",
    sectionId: "section-1",
    slotType: "content_unit",
    selectedObjectType: "content_unit_version",
    selectedObjectId: "cuv-1",
    orderIndex: 0,
    purpose: "Open with ROI case",
    isRequired: true,
    aiRecommended: false,
    ...overrides
  };
}

function section(overrides: Partial<StoryboardSection> = {}): StoryboardSection {
  return {
    id: "section-1",
    storyboardId: "storyboard-1",
    title: "Economic case",
    summary: "Why invest now",
    orderIndex: 0,
    slots: [slot()],
    ...overrides
  };
}

function warning(overrides: Partial<StoryboardDiagnosticWarning> = {}): StoryboardDiagnosticWarning {
  return {
    code: "gap_slot",
    severity: "warning",
    message: "Required gap needs content before publishing.",
    targetType: "storyboard_slot",
    targetId: "slot-1",
    ...overrides
  };
}

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    kind: "persistent_comment",
    targetType: "storyboard",
    targetId: "storyboard-1",
    status: "open",
    body: "Looks good",
    anchor: {},
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides
  };
}

describe("collectObjectRefs", () => {
  it("dedupes (type, id) pairs across sections and skips gaps", () => {
    const sections = [
      section({ id: "s1", slots: [slot({ id: "a", selectedObjectId: "cuv-1" }), slot({ id: "b", slotType: "gap", selectedObjectType: null, selectedObjectId: null })] }),
      section({ id: "s2", slots: [slot({ id: "c", selectedObjectId: "cuv-1" }), slot({ id: "d", selectedObjectId: "cuv-2" })] })
    ];
    expect(collectObjectRefs(sections)).toEqual([
      { type: "content_unit_version", id: "cuv-1" },
      { type: "content_unit_version", id: "cuv-2" }
    ]);
  });

  it("caps the number of refs returned", () => {
    const slots = Array.from({ length: 5 }, (_, index) => slot({ id: `slot-${index}`, selectedObjectId: `cuv-${index}` }));
    const sections = [section({ slots })];
    expect(collectObjectRefs(sections, 2)).toHaveLength(2);
  });
});

describe("slotDetailFor / objectDetailKey", () => {
  it("resolves the detail keyed by selectedObjectType:selectedObjectId", () => {
    const detail: SlotObjectDetail = { kind: "content_unit_version", href: "/content-units/cuv-1", comments: [], notes: [], whereUsed: [] };
    const details = { [objectDetailKey("content_unit_version", "cuv-1")]: detail };
    expect(slotDetailFor(slot(), details)).toBe(detail);
  });

  it("returns undefined for gap slots", () => {
    expect(slotDetailFor(slot({ selectedObjectId: null }), {})).toBeUndefined();
  });
});

describe("approvalTone / freshnessTone", () => {
  it("maps approval states to the shared Tone vocabulary", () => {
    expect(approvalTone("approved")).toBe("ok");
    expect(approvalTone("deprecated")).toBe("danger");
    expect(approvalTone("review")).toBe("warn");
    expect(approvalTone("draft")).toBe("neutral");
  });

  it("maps freshness states to the shared Tone vocabulary", () => {
    expect(freshnessTone("fresh")).toBe("ok");
    expect(freshnessTone("stale")).toBe("danger");
    expect(freshnessTone("aging")).toBe("warn");
  });
});

describe("warningsForSlot / warningsForSection", () => {
  it("matches warnings targeting the slot id or its selected content unit version", () => {
    const theSlot = slot();
    const warnings = [warning({ targetId: "slot-1" }), warning({ code: "duplicate_selection", targetType: "content_unit_version", targetId: "cuv-1" }), warning({ targetId: "other-slot" })];
    expect(warningsForSlot(warnings, theSlot)).toHaveLength(2);
  });

  it("aggregates warnings across every slot in a section", () => {
    const theSection = section({ slots: [slot({ id: "a", selectedObjectId: "cuv-1" }), slot({ id: "b", selectedObjectId: "cuv-2" })] });
    const warnings = [warning({ targetId: "a" }), warning({ targetType: "content_unit_version", targetId: "cuv-2" }), warning({ targetId: "not-in-section" })];
    expect(warningsForSection(warnings, theSection)).toHaveLength(2);
  });
});

describe("breakdownWarnings", () => {
  it("counts warnings by severity", () => {
    const warnings = [warning({ severity: "critical" }), warning({ severity: "warning" }), warning({ severity: "warning" }), warning({ severity: "info" })];
    expect(breakdownWarnings(warnings)).toEqual({ critical: 1, warning: 2, info: 1, total: 4 });
  });
});

describe("healthDescriptor", () => {
  it("labels scores by threshold", () => {
    expect(healthDescriptor(null)).toEqual({ label: "Not scored", tone: "neutral" });
    expect(healthDescriptor(90)).toEqual({ label: "Excellent", tone: "ok" });
    expect(healthDescriptor(65)).toEqual({ label: "Good", tone: "primary" });
    expect(healthDescriptor(45)).toEqual({ label: "Needs work", tone: "warn" });
    expect(healthDescriptor(10)).toEqual({ label: "At risk", tone: "danger" });
  });
});

describe("countSlots / countGapSlots", () => {
  it("counts total and gap slots across sections", () => {
    const sections = [
      section({ slots: [slot({ id: "a" }), slot({ id: "b", slotType: "gap", selectedObjectId: null })] }),
      section({ id: "s2", slots: [slot({ id: "c" })] })
    ];
    expect(countSlots(sections)).toBe(3);
    expect(countGapSlots(sections)).toBe(1);
  });
});

describe("comment anchoring helpers", () => {
  it("reads anchor.slotId / anchor.sectionId and builds a human label", () => {
    const slotComment = comment({ anchor: { sectionId: "section-1", slotId: "slot-1" } });
    const sectionComment = comment({ anchor: { sectionId: "section-1" } });
    const boardComment = comment({ anchor: {} });

    expect(anchorValue(slotComment, "slotId")).toBe("slot-1");
    expect(anchorLabel(slotComment)).toContain("slot ");
    expect(anchorLabel(sectionComment)).toContain("section ");
    expect(anchorLabel(boardComment)).toBe("storyboard");

    expect(commentsForSlot([slotComment, sectionComment, boardComment], "slot-1")).toEqual([slotComment]);
    expect(commentsForStoryboardLevel([slotComment, sectionComment, boardComment])).toEqual([boardComment]);
  });
});

describe("groupCommentThreads", () => {
  it("groups replies under their root, sorted oldest-first", () => {
    const root = comment({ id: "root", createdAt: "2026-01-01T00:00:00Z" });
    const replyLate = comment({ id: "reply-2", parentCommentId: "root", createdAt: "2026-01-03T00:00:00Z" });
    const replyEarly = comment({ id: "reply-1", parentCommentId: "root", createdAt: "2026-01-02T00:00:00Z" });

    const threads = groupCommentThreads([replyLate, root, replyEarly]);
    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe("root");
    expect(threads[0].replies.map((entry) => entry.id)).toEqual(["reply-1", "reply-2"]);
  });
});

describe("slotTitle", () => {
  it("prefers slot.purpose, then the object's display title, then a fallback", () => {
    expect(slotTitle(slot({ purpose: "Custom purpose" }))).toBe("Custom purpose");
    expect(slotTitle(slot({ purpose: null }), { kind: "content_block_version", href: "/x", displayTitle: "Block title", comments: [], notes: [], whereUsed: [] })).toBe("Block title");
    expect(slotTitle(slot({ purpose: null }))).toBe("Untitled slot");
  });
});

describe("diffSnapshots", () => {
  it("reports no differences for structurally identical snapshots", () => {
    const a = { sections: [section()] };
    const b = { sections: [section()] };
    expect(diffSnapshots(a, b)).toEqual([]);
  });

  it("detects added/removed sections and changed slot content by position", () => {
    const base = { sections: [section({ id: "s1", title: "Intro", slots: [slot({ id: "a", selectedObjectId: "cuv-1" })] })] };
    const compare = {
      sections: [
        section({ id: "s1b", title: "Intro", slots: [slot({ id: "a2", selectedObjectId: "cuv-2" })] }),
        section({ id: "s2", title: "New section", orderIndex: 1, slots: [] })
      ]
    };
    const diff = diffSnapshots(base, compare);
    expect(diff).toContainEqual({ kind: "slot-changed", label: "Section 1, slot 1 content changed" });
    expect(diff).toContainEqual({ kind: "section-added", label: 'Section 2 "New section" added' });
  });
});
