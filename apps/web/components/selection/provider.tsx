"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MySelectionContext, type MySelectionContextValue } from "./context";
import { addItem, clearItems, loadSelectionFromStorage, removeItem, saveSelectionToStorage, toggleItem } from "./store";
import { MySelectionDrawer } from "./selection-drawer";
import type { SelectionItem } from "./types";

/**
 * Global "shopping cart" for items across the app. Initializes empty on every render (server and
 * first client render match) and hydrates from localStorage in an effect, so there is never an
 * SSR/CSR markup mismatch. Mounts the slide-out drawer alongside its children.
 */
export function MySelectionProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    setItems(loadSelectionFromStorage());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveSelectionToStorage(items);
  }, [items]);

  const add = useCallback((item: SelectionItem) => setItems((prev) => addItem(prev, item)), []);
  const remove = useCallback((id: string) => setItems((prev) => removeItem(prev, id)), []);
  const toggle = useCallback((item: SelectionItem) => setItems((prev) => toggleItem(prev, item)), []);
  const clear = useCallback(() => setItems(clearItems()), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<MySelectionContextValue>(() => {
    const has = (id: string) => items.some((item) => item.id === id);
    return {
      items,
      count: items.length,
      isOpen,
      open,
      close,
      setOpen: setIsOpen,
      add,
      remove,
      toggle,
      clear,
      has
    };
  }, [items, isOpen, open, close, add, remove, toggle, clear]);

  return (
    <MySelectionContext.Provider value={value}>
      {children}
      <MySelectionDrawer />
    </MySelectionContext.Provider>
  );
}
