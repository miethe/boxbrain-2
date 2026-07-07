import React from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Check,
  ExternalLink,
  GitBranch,
  Hash,
  History,
  Layers,
  ListOrdered,
  Plus,
  Search as SearchIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag as TagIcon,
  Zap,
  type LucideIcon
} from "lucide-react";
import { API_BASE_URL, type SearchResultItem, type StatusChips } from "@/lib/api";
import { matchingVersionsLabel } from "@/features/ask/lib";
import { ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type Tone = "ok" | "warn" | "danger" | "ai" | "neutral";
export type SearchResultCardLayout = "row" | "tile";

export function SearchResultCard({
  item,
  showDebug = false,
  layout = "row",
  rank,
  selected,
  onToggleSelect
}: {
  item: SearchResultItem;
  showDebug?: boolean;
  layout?: SearchResultCardLayout;
  rank?: number;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const restricted = Boolean(item.statusChips?.isRestricted);
  const score = normalizeSearchScore(item.score);
  const href = searchResultHref(item);
  const status = item.statusChips;
  const isTile = layout === "tile";
  const versionsLabel = matchingVersionsLabel(item.explanationChips);
  // Permission filtering already happened server-side (a viewer without access never receives a
  // restricted item at all — see services/api ask-search use_cases `include_restricted`). This card
  // still masks the title/preview for restricted items as a visual reminder, so the selection-tray
  // toggle — which would otherwise capture the real title into a persisted local list — is hidden
  // to stay consistent with that masking rather than re-surfacing what the card just redacted.
  const canToggleSelect = Boolean(onToggleSelect) && !restricted;

  return (
    <div className="relative h-full">
      <Link
        href={href}
        className={clsx("card group block h-full p-3 hover:bg-slate-50", isTile ? "grid gap-3" : "grid gap-4 md:grid-cols-[170px_minmax(0,1fr)]")}
        aria-label={`Open ${restricted ? "restricted result" : item.title}`}
        data-testid="search-result-card"
      >
        <div className="relative">
          {restricted ? (
            <div className="grid aspect-video place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
              <ShieldAlert size={22} />
            </div>
          ) : item.previewUri ? (
            <RenderedPreview uri={item.previewUri} title={item.title} />
          ) : (
            <SlideThumb title={item.title} variant={previewVariant(item)} brand="BB" />
          )}
          {rank !== undefined && (
            <span
              className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-md bg-[var(--primary)] text-[11px] font-bold text-white"
              aria-label={`Rank ${rank}`}
            >
              {rank}
            </span>
          )}
          {isTile && versionsLabel && (
            <span className="absolute bottom-2 right-2 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">{versionsLabel}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 min-w-0 flex-1 truncate text-base font-bold">{restricted ? "Restricted result" : item.title}</h2>
            <ScorePill value={score} />
            {!isTile && <ExternalLink size={14} className="text-slate-400" aria-hidden="true" />}
          </div>
          {!isTile && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {restricted ? "No preview or summary is displayed for restricted content in search results." : item.summary?.trim() || "No summary returned for this result."}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag>{labelForResult(item)}</Tag>
            {status && <StatusRow status={status} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.explanationChips?.length ? (
              item.explanationChips.map((chip) => <ExplanationChip key={chip} label={chip} />)
            ) : (
              <StatusBadge tone="neutral">ranked match</StatusBadge>
            )}
            {showDebug && <Tag>raw {formatRawScore(item.score)}</Tag>}
          </div>
        </div>
      </Link>

      {canToggleSelect && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelect?.();
          }}
          aria-pressed={Boolean(selected)}
          aria-label={selected ? `Remove ${item.title} from my selection` : `Add ${item.title} to my selection`}
          title={selected ? "Remove from My Selection" : "Add to My Selection"}
          className={clsx(
            "absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border shadow-sm transition",
            selected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] bg-white/95 text-[var(--ink-3)] hover:border-[var(--primary-border)] hover:text-[var(--primary)]"
          )}
        >
          {selected ? <Check size={13} /> : <Plus size={13} />}
        </button>
      )}
    </div>
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

/** Real explanation chips returned by the ranking engine (lexical/semantic/metadata/trust/
 * freshness/rollup/version-count/composition-order signals), each paired with a matching icon.
 * Deliberately does not fabricate usage-based copy ("Reused often", "Recently used") the design
 * mock shows — that data does not exist in the API yet (see audit-digest ask-search API[no] gap). */
function ExplanationChip({ label }: { label: string }) {
  const Icon = explanationChipIcon(label);
  return (
    <span className="tag ai sm inline-flex items-center gap-1">
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}

export function explanationChipIcon(label: string): LucideIcon {
  const lowered = label.toLowerCase();
  if (lowered.includes("keyword")) return SearchIcon;
  if (lowered.includes("semantic")) return Sparkles;
  if (lowered.includes("metadata")) return TagIcon;
  if (lowered.includes("trusted") || lowered.includes("approved")) return ShieldCheck;
  if (lowered === "fresh") return Zap;
  if (lowered.includes("family rollup")) return Layers;
  if (lowered.includes("variant rollup")) return GitBranch;
  if (lowered.includes("version match") || /matching versions?/.test(lowered)) return History;
  if (lowered.includes("ordered composition")) return ListOrdered;
  return Hash;
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
