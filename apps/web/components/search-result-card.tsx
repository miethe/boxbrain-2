import React from "react";
import Link from "next/link";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { API_BASE_URL, type SearchResultItem, type StatusChips } from "@/lib/api";
import { ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type Tone = "ok" | "warn" | "danger" | "ai" | "neutral";

export function SearchResultCard({ item, showDebug = false }: { item: SearchResultItem; showDebug?: boolean }) {
  const restricted = Boolean(item.statusChips?.isRestricted);
  const score = normalizeSearchScore(item.score);
  const href = searchResultHref(item);
  const status = item.statusChips;

  return (
    <Link href={href} className="card grid gap-4 p-3 hover:bg-slate-50 md:grid-cols-[170px_minmax(0,1fr)]" aria-label={`Open ${restricted ? "restricted result" : item.title}`}>
      {restricted ? (
        <div className="grid aspect-video place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
          <ShieldAlert size={22} />
        </div>
      ) : item.previewUri ? (
        <RenderedPreview uri={item.previewUri} title={item.title} />
      ) : (
        <SlideThumb title={item.title} variant={previewVariant(item)} brand="BB" />
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 min-w-0 flex-1 truncate text-base font-bold">{restricted ? "Restricted result" : item.title}</h2>
          <ScorePill value={score} />
          <ExternalLink size={14} className="text-slate-400" />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
          {restricted ? "No preview or summary is displayed for restricted content in search results." : item.summary?.trim() || "No summary returned for this result."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag>{labelForResult(item)}</Tag>
          {status && <StatusRow status={status} />}
          {item.explanationChips?.length ? item.explanationChips.map((chip) => <StatusBadge key={chip} tone="ai">{chip}</StatusBadge>) : <StatusBadge tone="neutral">ranked match</StatusBadge>}
          {showDebug && <Tag>raw {formatRawScore(item.score)}</Tag>}
        </div>
      </div>
    </Link>
  );
}

function StatusRow({ status }: { status: StatusChips }) {
  return (
    <>
      {status.approvalState && <StatusBadge tone={approvalTone(status.approvalState)}>{status.approvalState}</StatusBadge>}
      {status.freshnessState && <StatusBadge tone={freshnessTone(status.freshnessState)}>{status.freshnessState}</StatusBadge>}
      {status.isCanonical && <StatusBadge tone="ok">canonical</StatusBadge>}
      {status.isRestricted && <StatusBadge tone="danger">restricted</StatusBadge>}
      {status.linkSource && <StatusBadge tone={status.linkSource === "ai" ? "ai" : "neutral"}>{status.linkSource}</StatusBadge>}
    </>
  );
}

function RenderedPreview({ uri, title }: { uri: string; title: string }) {
  return (
    <div
      className="slide-thumb light bg-cover bg-center"
      aria-label={`${title} preview`}
      style={{
        backgroundImage: `url("${assetUrl(uri)}")`
      }}
    >
      <div className="slide-content bg-white/75">
        <div className="slide-brand">BB</div>
        <div className="slide-title">{title}</div>
      </div>
    </div>
  );
}

export function normalizeSearchScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function searchResultHref(item: Pick<SearchResultItem, "objectId" | "objectType" | "resultGrain">) {
  if (item.resultGrain === "block" || item.objectType.includes("content_block")) return `/content-blocks/${item.objectId}`;
  if (item.resultGrain === "work_product" || item.objectType.includes("work_product")) return `/work-products/${item.objectId}`;
  if (item.resultGrain === "play" || item.objectType.includes("play")) return `/plays`;
  return `/content-units/${item.objectId}`;
}

function labelForResult(item: SearchResultItem) {
  if (item.resultGrain === "work_product") return "WorkProduct";
  if (item.resultGrain === "block") return "ContentBlock";
  if (item.resultGrain === "play") return "Play";
  if (item.resultGrain === "version") return "ContentUnit version";
  if (item.resultGrain === "variant") return "ContentUnit variant";
  return "ContentUnit family";
}

function previewVariant(item: SearchResultItem): "dark" | "light" | "teal" | "purple" {
  if (item.resultGrain === "work_product") return "dark";
  if (item.resultGrain === "block") return "teal";
  if (item.statusChips?.approvalState === "approved") return "light";
  return "purple";
}

function approvalTone(value: string): Tone {
  if (value === "approved") return "ok";
  if (value === "deprecated" || value === "archived") return "danger";
  if (value === "review") return "warn";
  return "neutral";
}

function freshnessTone(value: string): Tone {
  if (value === "fresh") return "ok";
  if (value === "stale") return "danger";
  return "warn";
}

function formatRawScore(value: number) {
  if (!Number.isFinite(value)) return "n/a";
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
