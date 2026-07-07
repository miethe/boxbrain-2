import { API_BASE_URL, type ReviewItem } from "@/lib/api";
import { QUEUE_TYPE_LABELS } from "./constants";
import type { QueueDefinition } from "./types";

export function assetUrl(uri?: string | null) {
  if (!uri) return undefined;
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

export function confidencePercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value <= 1 ? value * 100 : value)));
}

/** Design's RvDupCard 4-tier confidence ring: ok >=85, primary >=70, warn >=55, else danger. */
export function scoreTone(score: number): "ok" | "primary" | "warn" | "danger" {
  if (score >= 85) return "ok";
  if (score >= 70) return "primary";
  if (score >= 55) return "warn";
  return "danger";
}

export function confidenceWord(score: number): "High confidence" | "Medium confidence" | "Low confidence" {
  if (score >= 80) return "High confidence";
  if (score >= 55) return "Medium confidence";
  return "Low confidence";
}

export function queueLabel(queueType: string) {
  return QUEUE_TYPE_LABELS[queueType] ?? queueType.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function matchesQueueDefinition(item: ReviewItem, definition: QueueDefinition) {
  if (definition.id === "all") return true;
  return definition.apiQueueTypes.includes(item.queueType);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatRelative(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(value);
}

/** Whole-day difference between two ISO timestamps, or null when either is missing/invalid. */
export function daysBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round(Math.abs(da - db) / 86_400_000);
}

export function toPercent(score?: number | null) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score)));
}
