import { describe, expect, it } from "vitest";
import { addItem, clearItems, loadSelectionFromStorage, parseSelectionPayload, removeItem, saveSelectionToStorage, toggleItem } from "./store";
import type { SelectionItem } from "./types";

const wp: SelectionItem = { id: "wp-1", type: "workproduct", title: "Financial Services Pitch Deck" };
const cu: SelectionItem = { id: "cu-1", type: "contentunit", title: "Executive Summary — AI Platform", subtitle: "v2.3 · 92% match" };

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    dump: () => Object.fromEntries(store)
  };
}

describe("addItem", () => {
  it("appends a new item", () => {
    expect(addItem([], wp)).toEqual([wp]);
  });

  it("dedupes by id, keeping the first write", () => {
    const withWp = addItem([], wp);
    const result = addItem(withWp, { ...wp, title: "Renamed" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Financial Services Pitch Deck");
  });

  it("does not mutate the input array", () => {
    const input: SelectionItem[] = [];
    addItem(input, wp);
    expect(input).toHaveLength(0);
  });
});

describe("removeItem", () => {
  it("removes the matching id and leaves others untouched", () => {
    const result = removeItem([wp, cu], wp.id);
    expect(result).toEqual([cu]);
  });

  it("is a no-op when the id is absent", () => {
    const input = [wp];
    expect(removeItem(input, "missing")).toEqual(input);
  });
});

describe("toggleItem", () => {
  it("adds an item that is not yet selected", () => {
    expect(toggleItem([], wp)).toEqual([wp]);
  });

  it("removes an item that is already selected", () => {
    expect(toggleItem([wp], wp)).toEqual([]);
  });
});

describe("clearItems", () => {
  it("returns an empty array", () => {
    expect(clearItems()).toEqual([]);
  });
});

describe("parseSelectionPayload (persistence guard)", () => {
  it("returns [] for null/empty input", () => {
    expect(parseSelectionPayload(null)).toEqual([]);
    expect(parseSelectionPayload("")).toEqual([]);
  });

  it("returns [] for invalid JSON instead of throwing", () => {
    expect(parseSelectionPayload("{not json")).toEqual([]);
  });

  it("returns [] when the payload is not an array", () => {
    expect(parseSelectionPayload(JSON.stringify({ id: "wp-1" }))).toEqual([]);
  });

  it("filters out malformed entries but keeps valid ones", () => {
    const payload = JSON.stringify([wp, { id: "bad" }, "not-an-object", { id: "cu-1", type: "contentunit" }, cu]);
    expect(parseSelectionPayload(payload)).toEqual([wp, cu]);
  });

  it("round-trips a valid payload", () => {
    const payload = JSON.stringify([wp, cu]);
    expect(parseSelectionPayload(payload)).toEqual([wp, cu]);
  });
});

describe("loadSelectionFromStorage / saveSelectionToStorage", () => {
  it("returns [] when no storage is available (SSR guard)", () => {
    expect(loadSelectionFromStorage(undefined)).toEqual([]);
  });

  it("loads previously saved items back out", () => {
    const storage = memoryStorage();
    saveSelectionToStorage([wp, cu], storage);
    expect(loadSelectionFromStorage(storage)).toEqual([wp, cu]);
  });

  it("guards against a corrupted persisted payload", () => {
    const storage = memoryStorage({ "boxbrain.mySelection.v1": "{corrupt" });
    expect(loadSelectionFromStorage(storage)).toEqual([]);
  });

  it("is a no-op when no storage is available (SSR guard)", () => {
    expect(() => saveSelectionToStorage([wp], undefined)).not.toThrow();
  });
});
