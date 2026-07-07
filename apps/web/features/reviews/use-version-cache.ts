"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, getContentUnitVersion } from "@/lib/api";
import type { VersionCacheEntry } from "./types";

/**
 * Lazily fetches and caches `ContentUnitVersionDetail` by versionId so the compare workspace,
 * decision rail, and compare drawer can all enrich the (title + versionId only) compareObjects
 * the review API returns without re-fetching the same version more than once per Reviews session.
 */
export function useVersionCache() {
  const [entries, setEntries] = useState<Record<string, VersionCacheEntry>>({});
  const requested = useRef<Set<string>>(new Set());

  const ensure = useCallback((versionId?: string | null) => {
    if (!versionId || requested.current.has(versionId)) return;
    requested.current.add(versionId);
    setEntries((previous) => ({ ...previous, [versionId]: { status: "loading" } }));
    getContentUnitVersion(versionId)
      .then((data) => {
        setEntries((previous) => ({ ...previous, [versionId]: { status: "ready", data } }));
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setEntries((previous) => ({ ...previous, [versionId]: { status: "restricted" } }));
          return;
        }
        setEntries((previous) => ({
          ...previous,
          [versionId]: { status: "error", message: error instanceof Error ? error.message : "Version detail failed to load." }
        }));
      });
  }, []);

  const reset = useCallback(() => {
    requested.current.clear();
    setEntries({});
  }, []);

  return { entries, ensure, reset };
}
