"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";

/**
 * Minimal horizontal-scroll carousel with left/right arrow buttons. CSS scroll-snap does the real
 * work; the buttons just call scrollBy so keyboard/mouse users get the same left/right affordance
 * shown in the design mock-ups without needing any fabricated pagination state.
 */
export function CarouselRail({ children, ariaLabel }: { children: ReactNode; ariaLabel: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(direction: -1 | 1) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(240, node.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="icon-btn shrink-0 rounded-full" aria-label={`Scroll ${ariaLabel} left`} onClick={() => scrollByAmount(-1)}>
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <div ref={trackRef} role="list" aria-label={ariaLabel} className="flex flex-1 gap-3 overflow-x-auto scroll-smooth [scrollbar-width:thin]" style={{ scrollSnapType: "x proximity" }}>
        {children}
      </div>
      <button type="button" className="icon-btn shrink-0 rounded-full" aria-label={`Scroll ${ariaLabel} right`} onClick={() => scrollByAmount(1)}>
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
