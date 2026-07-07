"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, boxbrainApi, type ContentBlockVersionDetail, type ContentUnitFamilyCard, type WorkProductFamilyCard } from "@/lib/api";
import type { LoadState } from "./types";

export type LibraryCatalog = {
  state: LoadState;
  errorMessage: string | null;
  families: ContentUnitFamilyCard[];
  workProducts: WorkProductFamilyCard[];
  contentBlocks: ContentBlockVersionDetail[];
  reload: () => void;
};

function isRestrictedError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Loads the three real catalog sources the Library screen composes (ContentUnit families,
 * WorkProduct families, ContentBlocks) once, client-side, so every tab/view can share a single
 * fetch rather than re-requesting the same data per tab switch.
 */
export function useLibraryCatalog(): LibraryCatalog {
  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [families, setFamilies] = useState<ContentUnitFamilyCard[]>([]);
  const [workProducts, setWorkProducts] = useState<WorkProductFamilyCard[]>([]);
  const [contentBlocks, setContentBlocks] = useState<ContentBlockVersionDetail[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setErrorMessage(null);
    Promise.all([boxbrainApi.listContentUnitFamilies(), boxbrainApi.listWorkProductFamilies(), boxbrainApi.listContentBlocks()])
      .then(([familyEnvelope, workProductEnvelope, contentBlockEnvelope]) => {
        if (cancelled) return;
        const nextFamilies = familyEnvelope.items ?? [];
        const nextWorkProducts = workProductEnvelope.items ?? [];
        const nextBlocks = contentBlockEnvelope.items ?? [];
        setFamilies(nextFamilies);
        setWorkProducts(nextWorkProducts);
        setContentBlocks(nextBlocks);
        const isEmpty = nextFamilies.length === 0 && nextWorkProducts.length === 0 && nextBlocks.length === 0;
        setState(isEmpty ? "empty" : "ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFamilies([]);
        setWorkProducts([]);
        setContentBlocks([]);
        if (isRestrictedError(error)) {
          setState("restricted");
          return;
        }
        setState("error");
        setErrorMessage(error instanceof Error ? error.message : "The Library API request failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { state, errorMessage, families, workProducts, contentBlocks, reload };
}
