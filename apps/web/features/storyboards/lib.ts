// Pure, framework-free helpers for the Storyboard workspace screen. Kept dependency-free so the
// scoring/formatting logic is cheap to unit test in isolation from React, Next.js, and the live API.
import type {
  ApprovalState,
  Comment,
  ContentUnitWhereUsedReference,
  FreshnessState,
  Note,
  ProvenanceRecord,
  StoryboardDiagnosticWarning,
  StoryboardSection,
  StoryboardSlot
} from "@/lib/api";

export type SlotObjectKind = "content_unit_version" | "content_block_version" | "work_product_version";

/** Normalized detail for whichever real object a slot currently points at. Only fields the live API
 * actually returns are populated -- undefined/empty means "not available", never a fabricated value. */
export type SlotObjectDetail = {
  kind: SlotObjectKind;
  href: string;
  displayTitle?: string;
  summary?: string | null;
  approvalState?: ApprovalState;
  freshnessState?: FreshnessState;
  qualityScore?: number | null;
  usageScore?: number | null;
  speakerNotes?: string | null;
  extractedText?: string | null;
  provenance?: ProvenanceRecord;
  comments: Comment[];
  notes: Note[];
  whereUsed: ContentUnitWhereUsedReference[];
  createdAt?: string;
  versionNumber?: string;
  variantId?: string;
  blockType?: string;
  memberCount?: number;
  artifactType?: string;
};

export type ObjectRef = { type: SlotObjectKind; id: string };

/** Dedupes (type,id) pairs referenced by draft-section slots, capped defensively so a very large
 * storyboard cannot trigger an unbounded number of server-side detail fetches. */
export function collectObjectRefs(sections: StoryboardSection[], cap = 60): ObjectRef[] {
  const seen = new Map<string, ObjectRef>();
  for (const section of sections) {
    for (const slot of section.slots) {
      const type = slot.selectedObjectType;
      const id = slot.selectedObjectId;
      if (!type || !id) continue;
      if (type !== "content_unit_version" && type !== "content_block_version" && type !== "work_product_version") continue;
      const key = `${type}:${id}`;
      if (!seen.has(key)) seen.set(key, { type, id });
    }
  }
  return Array.from(seen.values()).slice(0, cap);
}

export function objectDetailKey(type?: string | null, id?: string | null): string {
  return `${type ?? "unknown"}:${id ?? "unknown"}`;
}

export function slotDetailFor(slot: StoryboardSlot, details: Record<string, SlotObjectDetail>): SlotObjectDetail | undefined {
  if (!slot.selectedObjectType || !slot.selectedObjectId) return undefined;
  return details[objectDetailKey(slot.selectedObjectType, slot.selectedObjectId)];
}

export type Tone = "ok" | "warn" | "danger" | "ai" | "primary" | "neutral";

export function approvalTone(value?: string): Tone {
  if (value === "approved") return "ok";
  if (value === "deprecated" || value === "archived") return "danger";
  if (value === "review") return "warn";
  return "neutral";
}

export function freshnessTone(value?: string): Tone {
  if (value === "fresh") return "ok";
  if (value === "stale") return "danger";
  if (value === "aging") return "warn";
  return "neutral";
}

export function warningsForSlot(warnings: StoryboardDiagnosticWarning[], slot: StoryboardSlot): StoryboardDiagnosticWarning[] {
  return warnings.filter((warning) => {
    if (warning.targetType === "storyboard_slot" && warning.targetId === slot.id) return true;
    if (warning.targetType === "content_unit_version" && warning.targetId === slot.selectedObjectId) return true;
    return false;
  });
}

export function warningsForSection(warnings: StoryboardDiagnosticWarning[], section: StoryboardSection): StoryboardDiagnosticWarning[] {
  const slotIds = new Set(section.slots.map((slot) => slot.id));
  const objectIds = new Set(section.slots.map((slot) => slot.selectedObjectId).filter(Boolean));
  return warnings.filter((warning) => {
    if (warning.targetType === "storyboard_slot" && warning.targetId && slotIds.has(warning.targetId)) return true;
    if (warning.targetType === "content_unit_version" && warning.targetId && objectIds.has(warning.targetId)) return true;
    return false;
  });
}

export type WarningBreakdown = { critical: number; warning: number; info: number; total: number };

export function breakdownWarnings(warnings: StoryboardDiagnosticWarning[]): WarningBreakdown {
  return warnings.reduce<WarningBreakdown>(
    (totals, warning) => {
      totals.total += 1;
      if (warning.severity === "critical") totals.critical += 1;
      else if (warning.severity === "warning") totals.warning += 1;
      else totals.info += 1;
      return totals;
    },
    { critical: 0, warning: 0, info: 0, total: 0 }
  );
}

export function healthDescriptor(score: number | null): { label: string; tone: Tone } {
  if (score == null) return { label: "Not scored", tone: "neutral" };
  if (score >= 80) return { label: "Excellent", tone: "ok" };
  if (score >= 60) return { label: "Good", tone: "primary" };
  if (score >= 40) return { label: "Needs work", tone: "warn" };
  return { label: "At risk", tone: "danger" };
}

export function countSlots(sections: StoryboardSection[]): number {
  return sections.reduce((total, section) => total + section.slots.length, 0);
}

export function countGapSlots(sections: StoryboardSection[]): number {
  return sections.reduce((total, section) => total + section.slots.filter((slot) => slot.slotType === "gap" || !slot.selectedObjectId).length, 0);
}

/** Groups flat Comment[] into root+reply threads (mirrors features/content-units/lib.ts so both
 * screens sort replies identically), scoped to this feature so the two screens can evolve
 * independently without one wave editing the other's owned directory. */
export function groupCommentThreads(comments: Comment[]): Array<{ root: Comment; replies: Comment[] }> {
  const roots = comments.filter((comment) => !comment.parentCommentId);
  const byParent = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!comment.parentCommentId) continue;
    const list = byParent.get(comment.parentCommentId) ?? [];
    list.push(comment);
    byParent.set(comment.parentCommentId, list);
  }
  const byDateAsc = (list: Comment[]) => [...list].sort((left, right) => dateValue(left.createdAt) - dateValue(right.createdAt));
  return byDateAsc(roots).map((root) => ({ root, replies: byDateAsc(byParent.get(root.id) ?? []) }));
}

function dateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatDate(value?: string | null): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatRelative(value?: string | null): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(value);
}

export function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** selectedObjectType -> the href of the full detail page for that object, used by "Open full
 * record" links throughout the inspector. */
export function objectHref(type: string, id: string): string {
  if (type === "content_block_version") return `/content-blocks/${id}`;
  if (type === "work_product_version") return `/work-products/${id}`;
  return `/content-units/${id}`;
}

export function slotTitle(slot: StoryboardSlot, detail?: SlotObjectDetail): string {
  if (slot.purpose) return slot.purpose;
  if (detail?.displayTitle) return detail.displayTitle;
  return "Untitled slot";
}

export function anchorValue(comment: Comment, key: string): string | null {
  const value = comment.anchor?.[key];
  return typeof value === "string" ? value : null;
}

export function anchorLabel(comment: Comment): string {
  const slotId = anchorValue(comment, "slotId");
  if (slotId) return `slot ${slotId.slice(0, 8)}`;
  const sectionId = anchorValue(comment, "sectionId");
  if (sectionId) return `section ${sectionId.slice(0, 8)}`;
  return "storyboard";
}

export function commentsForSlot(comments: Comment[], slotId: string): Comment[] {
  return comments.filter((comment) => anchorValue(comment, "slotId") === slotId);
}

export function commentsForStoryboardLevel(comments: Comment[]): Comment[] {
  return comments.filter((comment) => !anchorValue(comment, "slotId") && !anchorValue(comment, "sectionId"));
}

export type SnapshotDiffEntry = {
  kind: "section-added" | "section-removed" | "section-changed" | "slot-added" | "slot-removed" | "slot-changed";
  label: string;
};

/** A deliberately simple, honest structural diff between two real (already-loaded) immutable
 * snapshots -- aligns sections/slots by orderIndex position rather than a fabricated "smart" match,
 * since snapshot copies mint new ids each time (see CLAUDE.md domain rule 8: snapshots preserve
 * section/slot order and selected object refs). There is no backend diff endpoint (audit-digest.md
 * ## storyboard API[no]), so this runs entirely client-side against data already on the page. */
export function diffSnapshots(
  base: { sections: StoryboardSection[] },
  compare: { sections: StoryboardSection[] }
): SnapshotDiffEntry[] {
  const entries: SnapshotDiffEntry[] = [];
  const baseSections = [...base.sections].sort((left, right) => left.orderIndex - right.orderIndex);
  const compareSections = [...compare.sections].sort((left, right) => left.orderIndex - right.orderIndex);
  const sectionCount = Math.max(baseSections.length, compareSections.length);

  for (let index = 0; index < sectionCount; index += 1) {
    const a = baseSections[index];
    const b = compareSections[index];
    if (a && !b) {
      entries.push({ kind: "section-removed", label: `Section ${index + 1} "${a.title}" removed` });
      continue;
    }
    if (!a && b) {
      entries.push({ kind: "section-added", label: `Section ${index + 1} "${b.title}" added` });
      continue;
    }
    if (!a || !b) continue;
    if (a.title !== b.title) {
      entries.push({ kind: "section-changed", label: `Section ${index + 1} title changed: "${a.title}" -> "${b.title}"` });
    }
    const aSlots = [...a.slots].sort((left, right) => left.orderIndex - right.orderIndex);
    const bSlots = [...b.slots].sort((left, right) => left.orderIndex - right.orderIndex);
    const slotCount = Math.max(aSlots.length, bSlots.length);
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const sa = aSlots[slotIndex];
      const sb = bSlots[slotIndex];
      if (sa && !sb) entries.push({ kind: "slot-removed", label: `Section ${index + 1}, slot ${slotIndex + 1} removed` });
      else if (!sa && sb) entries.push({ kind: "slot-added", label: `Section ${index + 1}, slot ${slotIndex + 1} added` });
      else if (sa && sb && sa.selectedObjectId !== sb.selectedObjectId) entries.push({ kind: "slot-changed", label: `Section ${index + 1}, slot ${slotIndex + 1} content changed` });
    }
  }
  return entries;
}
