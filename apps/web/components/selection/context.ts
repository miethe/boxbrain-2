"use client";

import { createContext, useContext } from "react";
import type { SelectionItem } from "./types";

export type MySelectionContextValue = {
  items: SelectionItem[];
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  add: (item: SelectionItem) => void;
  remove: (id: string) => void;
  toggle: (item: SelectionItem) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const MySelectionContext = createContext<MySelectionContextValue | null>(null);

/** Access the My Selection store. Must be called under <MySelectionProvider>. */
export function useMySelection(): MySelectionContextValue {
  const ctx = useContext(MySelectionContext);
  if (!ctx) {
    throw new Error("useMySelection must be used within a MySelectionProvider");
  }
  return ctx;
}
