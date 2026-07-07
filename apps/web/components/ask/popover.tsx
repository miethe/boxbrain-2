"use client";

import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";

type PopoverProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (state: { onClick: () => void; isOpen: boolean }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  panelLabel?: string;
};

/** Lightweight anchored popover shared by the Ask filter chips and the "How it works" link.
 * Closes on outside click or Escape. Not a full focus trap (these are inline disclosures, not
 * blocking modals), but it is keyboard-dismissible and announces itself via aria-expanded. */
export function Popover({ isOpen, onOpenChange, trigger, children, align = "left", panelClassName, panelLabel }: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) onOpenChange(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {trigger({ onClick: () => onOpenChange(!isOpen), isOpen })}
      {isOpen && (
        <div
          role="dialog"
          aria-label={panelLabel}
          className={clsx(
            "absolute top-[calc(100%+6px)] z-20 w-72 max-w-[85vw] rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3 text-sm shadow-[var(--shadow-lg)]",
            align === "right" ? "right-0" : "left-0",
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
