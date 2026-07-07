import type { ApprovalState, ContentUnitVersion, FreshnessState, StatusChips } from "@/lib/api";

export type Tone = "ok" | "warn" | "danger" | "ai" | "primary" | "neutral";
export type ThumbVariant = "dark" | "light" | "teal" | "purple";

export type WorkProductSlot = {
  id: string;
  position: number;
  title: string;
  purpose: string;
  source: string;
  lastEdited?: string;
  unit: ContentUnitVersion;
};

export type WorkProductSection = {
  id: string;
  index: number;
  title: string;
  slots: WorkProductSlot[];
};

export function statusChipsFor(value: { [key: string]: unknown }): Partial<StatusChips> {
  if (!value.statusChips || typeof value.statusChips !== "object") return {};
  return value.statusChips as Partial<StatusChips>;
}

export function approvalTone(state?: ApprovalState | string): Tone {
  if (state === "approved") return "ok";
  if (state === "deprecated" || state === "archived") return "danger";
  if (state === "review") return "warn";
  return "neutral";
}

export function freshnessTone(state?: FreshnessState | string): Tone {
  if (state === "fresh") return "ok";
  if (state === "stale") return "danger";
  if (state === "aging") return "warn";
  return "neutral";
}

export function titleCase(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function thumbVariantForIndex(index: number): ThumbVariant {
  const variants: ThumbVariant[] = ["dark", "light", "teal", "purple"];
  return variants[index % variants.length];
}

export function deriveSections(filmstrip: ContentUnitVersion[], chunkSize = 4): WorkProductSection[] {
  if (filmstrip.length === 0) return [];
  const sections: WorkProductSection[] = [];
  for (let index = 0; index < filmstrip.length; index += chunkSize) {
    const sectionIndex = sections.length + 1;
    const slice = filmstrip.slice(index, index + chunkSize);
    sections.push({
      id: `section-${sectionIndex}`,
      index: sectionIndex,
      title: `Deck Section ${sectionIndex}`,
      slots: slice.map((unit, localIndex) => {
        const position = index + localIndex + 1;
        const sourceOrder = typeof unit.sourceOrderIndex === "number" ? unit.sourceOrderIndex + 1 : position;
        return {
          id: `${sectionIndex}.${localIndex + 1}`,
          position,
          title: unit.summary?.trim() || `ContentUnit ${position}`,
          purpose: "Ordered WorkProduct composition slot",
          source: `Slide ${sourceOrder}`,
          lastEdited: unit.createdAt,
          unit
        };
      })
    });
  }
  return sections;
}

export function clampPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}
