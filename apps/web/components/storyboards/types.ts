import type { StatusChips } from "@/lib/api";

export type TrayObjectType = "content_unit_version" | "content_block_version" | "work_product_version";

export type TrayItem = {
  key: string;
  selectedObjectType: TrayObjectType;
  selectedObjectId: string;
  title: string;
  summary?: string | null;
  score?: number;
  statusChips?: StatusChips;
  createdAt?: string;
};

export type PendingTarget =
  | { kind: "add"; sectionId: string; label: string; orderIndex: number }
  | { kind: "swap"; slotId: string; sectionId: string; label: string }
  | null;

type SectionRef = { id: string; title: string; summary?: string | null; orderIndex: number };

/** Structural shape of the bound Server Actions the workspace client needs. Declared independently
 * of features/storyboards/actions.ts (a "use server" module) so this file stays a plain, importable
 * type module; the real bound functions are passed down from the Server Component page. */
export type StoryboardActions = {
  insertSection: (input: { storyboardId: string; title: string; summary?: string | null; insertAtIndex: number; existingSections: SectionRef[] }) => Promise<void>;
  renameSection: (input: { storyboardId: string; sectionId: string; title: string; summary?: string | null; orderIndex: number }) => Promise<void>;
  reorderSections: (input: { storyboardId: string; sections: SectionRef[]; orderedIds: string[] }) => Promise<void>;
  addSlotFromLibrary: (input: {
    storyboardId: string;
    sectionId: string;
    selectedObjectType: string;
    selectedObjectId: string;
    purpose?: string | null;
    orderIndex?: number;
    isRequired?: boolean;
  }) => Promise<void>;
  addGapSlot: (input: { storyboardId: string; sectionId: string; purpose?: string | null; orderIndex?: number }) => Promise<void>;
  swapSlotContent: (input: { storyboardId: string; slotId: string; selectedObjectType: string; selectedObjectId: string; purpose?: string | null }) => Promise<void>;
  reorderSlots: (input: { storyboardId: string; updates: Array<{ slotId: string; orderIndex: number }> }) => Promise<void>;
  createSnapshot: (formData: FormData) => void | Promise<void>;
  createAnchoredComment: (formData: FormData) => void | Promise<void>;
  createSlotObjectNote: (formData: FormData) => void | Promise<void>;
};
