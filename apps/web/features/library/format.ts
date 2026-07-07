import { API_BASE_URL, type ApprovalState, type FreshnessState, type StatusChips, type Taxonomy } from "@/lib/api";

export function approvalTone(value?: ApprovalState | string) {
  if (value === "approved") return "ok" as const;
  if (value === "deprecated" || value === "archived") return "danger" as const;
  if (value === "review") return "warn" as const;
  return "neutral" as const;
}

export function freshnessTone(value?: FreshnessState | string) {
  if (value === "fresh") return "ok" as const;
  if (value === "stale") return "danger" as const;
  return "warn" as const;
}

export function taxonomyTags(taxonomy?: Taxonomy, limit = 8): string[] {
  if (!taxonomy) return [];
  const values = Object.values(taxonomy)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return Array.from(new Set(values)).slice(0, limit);
}

export function assetUrl(uri?: string | null) {
  if (!uri) return undefined;
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

export function toPercent(score: number) {
  const scaled = score > 1 ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

export function formatDate(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function humanize(value?: string | null) {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function slideThumbVariant(seed: string): "dark" | "light" | "teal" | "purple" {
  const palette = ["dark", "light", "teal", "purple"] as const;
  const hash = Array.from(seed || "x").reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function fileIconToneFor(unitType?: string | null) {
  const value = (unitType ?? "").toLowerCase();
  if (value.includes("doc") || value.includes("brief") || value.includes("whitepaper") || value.includes("proposal")) return "doc" as const;
  if (value.includes("pdf")) return "pdf" as const;
  if (value.includes("image") || value.includes("img") || value.includes("visual")) return "img" as const;
  return "ppt" as const;
}

export function confidenceLevel(confidence?: number | null) {
  if (confidence === undefined || confidence === null) return null;
  const pct = toPercent(confidence);
  if (pct >= 85) return { pct, level: "High", tone: "ok" as const };
  if (pct >= 70) return { pct, level: "Medium", tone: "warn" as const };
  return { pct, level: "Low", tone: "danger" as const };
}

export type HealthBucket = "trusted" | "review" | "outdated";

/** Buckets an object's real statusChips into a trust bucket for the honest, computed Content Health panel. */
export function healthBucketFor(status?: StatusChips): HealthBucket {
  if (!status) return "review";
  if (status.approvalState === "approved") return "trusted";
  if (status.approvalState === "deprecated" || status.approvalState === "archived" || status.freshnessState === "stale") return "outdated";
  return "review";
}
