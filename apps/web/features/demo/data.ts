import {
  Archive,
  BookOpen,
  CheckCircle2,
  FileStack,
  Flag,
  Home,
  LayoutGrid,
  Library,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TrustState = "draft" | "review" | "approved" | "deprecated" | "archived";
export type FreshnessState = "fresh" | "watch" | "stale";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: string;
  preview?: boolean;
  kbd?: string;
};

export type ContentFamily = {
  id: string;
  title: string;
  summary: string;
  canonicalVariant: string;
  latestVersion: string;
  trust: TrustState;
  freshness: FreshnessState;
  usageCount: number;
  variantCount: number;
  versionCount: number;
  taxonomy: string[];
  restricted?: boolean;
  thumb: "dark" | "light" | "teal" | "purple";
  provenance: string;
  similarity: number;
};

export type WorkProduct = {
  id: string;
  title: string;
  type: string;
  version: string;
  status: TrustState;
  owner: string;
  updatedAt: string;
  slideCount: number;
  summary: string;
  thumb: "dark" | "light" | "teal" | "purple";
  sections: string[];
};

export type ReviewItem = {
  id: string;
  queue: "duplicate" | "variant" | "stale" | "approval";
  title: string;
  candidate: string;
  confidence: number;
  priority: "High" | "Medium" | "Low";
  rationale: string;
};

export type StoryboardSection = {
  id: string;
  title: string;
  goal: string;
  slots: Array<{
    id: string;
    title: string;
    state: "filled" | "gap" | "warning";
    content?: string;
    trust?: TrustState;
  }>;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ask", label: "Search", icon: Search, kbd: "⌘K" },
  { href: "/plays", label: "Plays", icon: BookOpen, preview: true },
  { href: "/opportunities", label: "Opportunities", icon: Target, preview: true },
  { href: "/library", label: "Library", icon: Library },
  { href: "/storyboards/sb-cloud-modernization", label: "Storyboards", icon: LayoutGrid },
  { href: "/reviews", label: "Reviews", icon: ShieldCheck, count: "12" },
  { href: "/admin", label: "Admin", icon: Settings }
];

export const secondaryNav: NavItem[] = [
  { href: "/ingestion", label: "Ingestion", icon: Archive },
  { href: "/variation-explorer", label: "Variation Explorer", icon: FileStack },
  { href: "/publish", label: "Publish", icon: CheckCircle2 }
];

export const favoriteItems = [
  "Executive Cloud Modernization Story",
  "Board ROI Proof Sequence",
  "Technical Migration Deep Dive",
  "EMEA Modernization Variant"
];

export const contentFamilies: ContentFamily[] = [
  {
    id: "cu-cloud-roi",
    title: "Cloud Modernization ROI",
    summary: "Canonical ROI slide family for executive and board conversations.",
    canonicalVariant: "Executive",
    latestVersion: "v3.2",
    trust: "approved",
    freshness: "fresh",
    usageCount: 47,
    variantCount: 4,
    versionCount: 8,
    taxonomy: ["ROI", "Cloud", "Executive"],
    thumb: "light",
    provenance: "Executive Overview Deck · slide 6",
    similarity: 94
  },
  {
    id: "cu-architecture-path",
    title: "Migration Architecture Path",
    summary: "Technical architecture path with phases, dependencies, and risk gates.",
    canonicalVariant: "Technical",
    latestVersion: "v2.4",
    trust: "review",
    freshness: "watch",
    usageCount: 29,
    variantCount: 3,
    versionCount: 5,
    taxonomy: ["Architecture", "Technical", "Migration"],
    thumb: "teal",
    provenance: "Architecture Deep Dive · slide 9",
    similarity: 87
  },
  {
    id: "cu-board-economics",
    title: "Board Economic Case",
    summary: "Board-ready economic model with payback, margin, and operating leverage.",
    canonicalVariant: "Board",
    latestVersion: "v1.8",
    trust: "approved",
    freshness: "fresh",
    usageCount: 63,
    variantCount: 5,
    versionCount: 12,
    taxonomy: ["Board", "Economics", "Margin"],
    thumb: "dark",
    provenance: "Board Update Pack · slide 4",
    similarity: 91
  },
  {
    id: "cu-emea-proof",
    title: "EMEA Customer Proof",
    summary: "Regional proof story with localized implementation evidence.",
    canonicalVariant: "EMEA",
    latestVersion: "v1.1",
    trust: "draft",
    freshness: "stale",
    usageCount: 12,
    variantCount: 2,
    versionCount: 3,
    taxonomy: ["Proof", "EMEA", "Customer"],
    restricted: true,
    thumb: "purple",
    provenance: "Regional Variant Pack · slide 7",
    similarity: 82
  }
];

export const workProducts: WorkProduct[] = [
  {
    id: "wp-exec-overview",
    title: "Cloud Modernization Executive Overview",
    type: "Presentation Deck",
    version: "v3.2",
    status: "approved",
    owner: "Sarah Chen",
    updatedAt: "May 2, 2026",
    slideCount: 12,
    summary: "Executive narrative for modernization urgency, ROI, architecture path, proof, and next steps.",
    thumb: "dark",
    sections: ["Why change now", "Economic case", "Architecture path", "Proof and next steps"]
  },
  {
    id: "wp-technical-deep-dive",
    title: "Technical Architecture Deep Dive",
    type: "Deck",
    version: "v2.4",
    status: "review",
    owner: "Alex Kim",
    updatedAt: "April 28, 2026",
    slideCount: 18,
    summary: "Technical migration plan with current-state constraints, architecture phases, and governance gates.",
    thumb: "teal",
    sections: ["Current state", "Target architecture", "Migration waves", "Risks"]
  }
];

export const reviewItems: ReviewItem[] = [
  {
    id: "rev-duplicate-roi",
    queue: "duplicate",
    title: "Potential duplicate: Cloud Modernization ROI",
    candidate: "Board Economic Case v1.8 vs Executive ROI v3.2",
    confidence: 94,
    priority: "High",
    rationale: "High semantic overlap, similar chart structure, and shared source text hash fragment."
  },
  {
    id: "rev-variant-emea",
    queue: "variant",
    title: "Suggested EMEA variant link",
    candidate: "EMEA Customer Proof may belong under Customer Proof family",
    confidence: 88,
    priority: "Medium",
    rationale: "Regional taxonomy and visual pattern match, but source provenance differs."
  },
  {
    id: "rev-stale-qbr",
    queue: "stale",
    title: "Stale content warning",
    candidate: "Legacy QBR operating margin slide",
    confidence: 81,
    priority: "High",
    rationale: "Last approved nine months ago and superseded by board pack metrics."
  }
];

export const storyboardSections: StoryboardSection[] = [
  {
    id: "sec-why",
    title: "Why change now",
    goal: "Establish urgency and business context.",
    slots: [
      { id: "slot-1", title: "Market pressure", state: "filled", content: "Modernization urgency", trust: "approved" },
      { id: "slot-2", title: "Current-state cost", state: "gap" }
    ]
  },
  {
    id: "sec-economics",
    title: "Economic case",
    goal: "Quantify value and risk-adjusted payback.",
    slots: [
      { id: "slot-3", title: "ROI model", state: "filled", content: "Cloud Modernization ROI", trust: "approved" },
      { id: "slot-4", title: "Board metric proof", state: "warning", content: "Board Economic Case", trust: "approved" }
    ]
  },
  {
    id: "sec-path",
    title: "Architecture and migration path",
    goal: "Show credible execution path.",
    slots: [
      { id: "slot-5", title: "Migration waves", state: "filled", content: "Migration Architecture Path", trust: "review" },
      { id: "slot-6", title: "Regional proof", state: "gap" }
    ]
  }
];

export const stats = [
  { label: "Content families", value: "128", hint: "14 pending review", icon: Archive },
  { label: "Approved units", value: "82%", hint: "+6% this month", icon: CheckCircle2 },
  { label: "Storyboard reuse", value: "47", hint: "12 snapshots", icon: LayoutGrid },
  { label: "Restricted hidden", value: "9", hint: "filtered from viewer search", icon: ShieldCheck }
];

export const askSuggestions = [
  "approved executive cloud modernization ROI slide",
  "3 slide ROI story for a board deck",
  "technical architecture migration path",
  "stale QBR operating margin slide",
  "EMEA modernization proof"
];

export const people = [
  { name: "Sarah Chen", role: "Enterprise AE", icon: Star },
  { name: "Alex Kim", role: "Solutions Architect", icon: Users },
  { name: "Priya Raman", role: "Content Curator", icon: ShieldCheck },
  { name: "Jordan Lee", role: "Reviewer", icon: Flag },
  { name: "Taylor Morgan", role: "Admin", icon: Settings },
  { name: "BoxBrain AI", role: "Suggestion source", icon: Sparkles }
];
