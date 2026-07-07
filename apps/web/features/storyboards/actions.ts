"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { boxbrainApi, type StoryboardSlotType } from "@/lib/api";
import { updateStoryboardSection } from "./section-api";

/** All Storyboard workspace write-actions live here so both the Server Component page and the
 * "use client" workspace can share one source of truth. Every action still calls the same real
 * boxbrain API endpoints the pre-uplift page used (createStoryboardSection/Slot,
 * updateStoryboardSlot, createStoryboardSnapshot, createComment, analyzeStoryboard) -- only the
 * interaction that triggers them changed (drag/click-from-library instead of raw-UUID text
 * inputs; see audit-digest.md ## storyboard [H|interaction]). */

function slotTypeForSelectedObject(selectedObjectType: string | null | undefined): StoryboardSlotType {
  if (selectedObjectType === "content_block_version") return "content_block";
  if (selectedObjectType === "work_product_version") return "work_product_ref";
  if (selectedObjectType === "content_unit_version") return "content_unit";
  return "gap";
}

function requiredFormValue(formData: FormData, field: string) {
  const value = optionalFormValue(formData, field);
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

function optionalFormValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}


export async function createStoryboardAction(formData: FormData) {
  const storyboard = await boxbrainApi.createStoryboard({
    title: requiredFormValue(formData, "title"),
    mode: (optionalFormValue(formData, "mode") ?? "work_product") as "work_product" | "play" | "opportunity"
  });
  redirect(`/storyboards/${storyboard.id}`);
}

/** Inserts a new section at a specific position, shifting every existing section at/after that
 * position by +1 first (CreateStoryboardSectionRequest.orderIndex is a plain integer column, so
 * "insert between" requires re-indexing the neighbors rather than a fractional index). */
export async function insertSectionAction(input: {
  storyboardId: string;
  title: string;
  summary?: string | null;
  insertAtIndex: number;
  existingSections: Array<{ id: string; title: string; summary?: string | null; orderIndex: number }>;
}) {
  const toShift = input.existingSections.filter((section) => section.orderIndex >= input.insertAtIndex);
  await Promise.all(
    toShift.map((section) => updateStoryboardSection(section.id, { title: section.title, summary: section.summary ?? null, orderIndex: section.orderIndex + 1 }))
  );
  await boxbrainApi.createStoryboardSection(input.storyboardId, {
    title: input.title,
    summary: input.summary ?? null,
    orderIndex: input.insertAtIndex
  });
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

export async function renameSectionAction(input: { storyboardId: string; sectionId: string; title: string; summary?: string | null; orderIndex: number }) {
  await updateStoryboardSection(input.sectionId, { title: input.title, summary: input.summary ?? null, orderIndex: input.orderIndex });
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

/** Persists a drag-and-drop section reorder. Only sections whose position actually changed are
 * patched (title/summary are re-sent unchanged because CreateStoryboardSectionRequest requires
 * `title`). */
export async function reorderSectionsAction(input: {
  storyboardId: string;
  sections: Array<{ id: string; title: string; summary?: string | null; orderIndex: number }>;
  orderedIds: string[];
}) {
  const byId = new Map(input.sections.map((section) => [section.id, section]));
  const updates = input.orderedIds
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => byId.get(id)?.orderIndex !== index);
  await Promise.all(
    updates.map(({ id, index }) => {
      const section = byId.get(id);
      if (!section) return Promise.resolve();
      return updateStoryboardSection(id, { title: section.title, summary: section.summary ?? null, orderIndex: index });
    })
  );
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

/** Adds content to a gap slot (or a brand-new slot) picked from the Content Library tray --
 * replaces the old raw-UUID text-input form with a typed, click/drag-driven action. */
export async function addSlotFromLibraryAction(input: {
  storyboardId: string;
  sectionId: string;
  selectedObjectType: string;
  selectedObjectId: string;
  purpose?: string | null;
  orderIndex?: number;
  isRequired?: boolean;
}) {
  await boxbrainApi.createStoryboardSlot(input.sectionId, {
    slotType: slotTypeForSelectedObject(input.selectedObjectType),
    selectedObjectType: input.selectedObjectType,
    selectedObjectId: input.selectedObjectId,
    purpose: input.purpose ?? null,
    orderIndex: input.orderIndex,
    isRequired: input.isRequired ?? true
  });
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

export async function addGapSlotAction(input: { storyboardId: string; sectionId: string; purpose?: string | null; orderIndex?: number }) {
  await boxbrainApi.createStoryboardSlot(input.sectionId, {
    slotType: "gap",
    selectedObjectType: null,
    selectedObjectId: null,
    purpose: input.purpose ?? null,
    orderIndex: input.orderIndex,
    isRequired: true
  });
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

/** Swaps a slot's selected content (drag a library chip onto an existing slot, or use the
 * inspector's Swap action). */
export async function swapSlotContentAction(input: {
  storyboardId: string;
  slotId: string;
  selectedObjectType: string;
  selectedObjectId: string;
  purpose?: string | null;
}) {
  await boxbrainApi.updateStoryboardSlot(input.slotId, {
    slotType: slotTypeForSelectedObject(input.selectedObjectType),
    selectedObjectType: input.selectedObjectType,
    selectedObjectId: input.selectedObjectId,
    purpose: input.purpose ?? undefined
  });
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

export async function reorderSlotsAction(input: { storyboardId: string; updates: Array<{ slotId: string; orderIndex: number }> }) {
  await Promise.all(input.updates.map((update) => boxbrainApi.updateStoryboardSlot(update.slotId, { orderIndex: update.orderIndex })));
  revalidatePath(`/storyboards/${input.storyboardId}`);
}

export async function createSnapshotAction(formData: FormData) {
  const storyboardId = requiredFormValue(formData, "storyboardId");
  const snapshot = await boxbrainApi.createStoryboardSnapshot(storyboardId, optionalFormValue(formData, "versionLabel"));
  revalidatePath(`/storyboards/${storyboardId}`);
  redirect(`/storyboards/${storyboardId}?snapshotId=${snapshot.id}`);
}

export async function createAnchoredCommentAction(formData: FormData) {
  const storyboardId = requiredFormValue(formData, "storyboardId");
  const [sectionId, slotId] = (optionalFormValue(formData, "targetAnchor") ?? "|").split("|");
  const kind = (optionalFormValue(formData, "kind") ?? "persistent_comment") as "review_comment" | "persistent_comment" | "note_discussion";
  await boxbrainApi.createComment({
    kind,
    targetType: "storyboard",
    targetId: storyboardId,
    body: requiredFormValue(formData, "body"),
    parentCommentId: optionalFormValue(formData, "parentCommentId"),
    anchor: {
      sectionId: sectionId || null,
      slotId: slotId || null,
      snapshotId: optionalFormValue(formData, "snapshotId")
    }
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}

/** Creates a real Note entity (distinct from Comment per CLAUDE.md domain rule #9) about the
 * underlying object bound to a slot -- e.g. editorial usage guidance for the ContentUnit version,
 * not feedback about this particular placement. */
export async function createSlotObjectNoteAction(formData: FormData) {
  const storyboardId = requiredFormValue(formData, "storyboardId");
  await boxbrainApi.createNote({
    targetType: requiredFormValue(formData, "targetType"),
    targetId: requiredFormValue(formData, "targetId"),
    title: optionalFormValue(formData, "title"),
    body: requiredFormValue(formData, "body"),
    noteType: optionalFormValue(formData, "noteType") ?? "usage_guidance",
    isPinned: formData.get("isPinned") === "on"
  });
  revalidatePath(`/storyboards/${storyboardId}`);
}
