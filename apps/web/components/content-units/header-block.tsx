import Link from "next/link";
import { ChevronRight, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui";
import type { FreshnessState, Storyboard } from "@/lib/api";
import { formatDate, freshnessTone, type SlidePosition } from "@/features/content-units/lib";
import { HeaderActions } from "./header-actions";

export function ContentUnitHeaderBlock({
  pageId,
  versionId,
  title,
  isCanonical,
  isApproved,
  isAiLinked,
  isRestricted,
  freshnessState,
  slideId,
  slidePosition,
  parentTitle,
  lastModified,
  breadcrumbParentTitle,
  thumb,
  storyboards,
  addToStoryboardAction
}: {
  pageId: string;
  versionId?: string;
  title: string;
  isCanonical: boolean;
  isApproved: boolean;
  isAiLinked: boolean;
  isRestricted: boolean;
  freshnessState?: FreshnessState;
  slideId?: string;
  slidePosition?: SlidePosition | null;
  parentTitle?: string | null;
  lastModified?: string | null;
  breadcrumbParentTitle?: string | null;
  thumb?: string | null;
  storyboards: Storyboard[];
  addToStoryboardAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-3)]">
        <Link href="/library" className="hover:text-[var(--ink)]">
          Content Library
        </Link>
        {breadcrumbParentTitle && (
          <>
            <ChevronRight size={12} aria-hidden="true" />
            <span className="max-w-[240px] truncate text-[var(--ink-2)]">{breadcrumbParentTitle}</span>
          </>
        )}
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-[var(--ink)]">ContentUnit</span>
      </nav>

      <div className="page-head-row">
        <div style={{ flex: 1 }}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[26px] font-bold tracking-tight text-[var(--ink)]">{title}</h1>
            {isCanonical && <Badge kind="primary">Canonical</Badge>}
            {isApproved && <Badge kind="ok">Approved</Badge>}
            {freshnessState && <Badge kind={freshnessTone(freshnessState)}>{freshnessState}</Badge>}
            {isRestricted && <Badge kind="danger">Restricted</Badge>}
            {isAiLinked && (
              <span className="badge ai">
                <LinkIcon size={10} aria-hidden="true" /> AI-linked
              </span>
            )}
          </div>
          <div className="muted mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {slideId && <span className="kbd">Slide ID: {slideId}</span>}
            {slidePosition && parentTitle && (
              <>
                <span>·</span>
                <span>
                  Slide {slidePosition.index} of {slidePosition.total} in {parentTitle}
                </span>
              </>
            )}
            {lastModified && (
              <>
                <span>·</span>
                <span>Created {formatDate(lastModified)}</span>
              </>
            )}
          </div>
        </div>
        <HeaderActions pageId={pageId} versionId={versionId} title={title} subtitle={parentTitle ?? undefined} thumb={thumb} storyboards={storyboards} addToStoryboardAction={addToStoryboardAction} />
      </div>
    </div>
  );
}
