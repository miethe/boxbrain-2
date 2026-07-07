// Pure reducer-style helpers for the My Selection store, kept framework-free so they are cheap to
// unit test in isolation from React and from localStorage/browser globals.
import type { SelectionItem } from "./types";

export const SELECTION_STORAGE_KEY = "boxbrain.mySelection.v1";

/** Adds an item, de-duplicated by id. Re-adding an existing id is a no-op (first write wins). */
export function addItem(items: SelectionItem[], item: SelectionItem): SelectionItem[] {
  if (items.some((existing) => existing.id === item.id)) return items;
  return [...items, item];
}

export function removeItem(items: SelectionItem[], id: string): SelectionItem[] {
  return items.filter((existing) => existing.id !== id);
}

/** Adds the item if absent, removes it if present. */
export function toggleItem(items: SelectionItem[], item: SelectionItem): SelectionItem[] {
  return items.some((existing) => existing.id === item.id) ? removeItem(items, item.id) : addItem(items, item);
}

export function clearItems(): SelectionItem[] {
  return [];
}

function isSelectionItem(value: unknown): value is SelectionItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && candidate.id.length > 0 && typeof candidate.type === "string" && typeof candidate.title === "string";
}

/** Validates untrusted JSON (e.g. from localStorage) before it is allowed into state. */
export function parseSelectionPayload(raw: string | null): SelectionItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSelectionItem);
  } catch {
    return [];
  }
}

/** Reads persisted selection state. Safe to call during SSR (returns []) or with a corrupt payload. */
export function loadSelectionFromStorage(storage: Pick<Storage, "getItem"> | undefined = safeLocalStorage()): SelectionItem[] {
  if (!storage) return [];
  try {
    return parseSelectionPayload(storage.getItem(SELECTION_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Persists selection state. Silently no-ops if storage is unavailable (SSR, quota, privacy mode). */
export function saveSelectionToStorage(items: SelectionItem[], storage: Pick<Storage, "setItem"> | undefined = safeLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors / privacy-mode storage rejections — selection stays in memory only.
  }
}

function safeLocalStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
