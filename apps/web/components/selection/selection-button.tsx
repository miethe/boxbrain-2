"use client";

import clsx from "clsx";
import { Bookmark } from "lucide-react";
import { useMySelection } from "./context";

/** Topbar pill — live selection count, opens the My Selection drawer. */
export function MySelectionButton({ className }: { className?: string }) {
  const { count, open } = useMySelection();
  const hasItems = count > 0;

  return (
    <button
      type="button"
      onClick={open}
      title="My selection"
      aria-label={hasItems ? `My selection, ${count} item${count === 1 ? "" : "s"}` : "My selection"}
      data-testid="my-selection-button"
      className={clsx(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
        hasItems
          ? "border-[var(--primary-border)] bg-[var(--primary-bg)] text-[var(--primary)] hover:bg-[var(--primary-border)]/40"
          : "border-transparent bg-transparent text-[var(--ink-2)] hover:bg-slate-100",
        className
      )}
    >
      <Bookmark size={14} aria-hidden="true" />
      <span className="hidden lg:inline">My selection</span>
      {hasItems && (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white">{count}</span>
      )}
    </button>
  );
}
