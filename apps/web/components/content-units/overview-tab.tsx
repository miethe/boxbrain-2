import { ExternalLink, Layers, Shield, Sparkles, Tag as TagIcon } from "lucide-react";
import { Card, Tag } from "@/components/ui";
import type { ContentUnitVersionDetail, ContentUnitWhereUsedReference, ProvenanceRecord, SearchResultItem } from "@/lib/api";
import type { ActivityEvent } from "@/features/content-units/lib";
import { ContentPreview } from "./content-preview";
import { ExpandableText } from "./expandable-text";
import { OverviewPanelNav, type OverviewPanelKey } from "./tab-nav";
import { TrustQualityCard } from "./trust-quality";
import { TextPanel } from "./text-panel";
import { ProvenanceGrid } from "./provenance-grid";
import { RelationshipsPanel } from "./relationships-panel";
import { ActivityTimeline } from "./activity-timeline";
import { VariantCarousel, type CarouselCard } from "./variant-carousel";
import { WhereUsedGrid } from "./where-used-list";
import type { SlidePosition } from "@/features/content-units/lib";

export function OverviewTab({
  pageId,
  previewTitle,
  previewUri,
  panel,
  version,
  summary,
  tags,
  provenance,
  slidePosition,
  carouselCards,
  whereUsed,
  similar,
  activityEvents,
  similarHref
}: {
  pageId: string;
  previewTitle: string;
  previewUri?: string | null;
  panel: OverviewPanelKey;
  version?: ContentUnitVersionDetail;
  summary?: string | null;
  tags: string[];
  provenance?: ProvenanceRecord;
  slidePosition?: SlidePosition | null;
  carouselCards: CarouselCard[];
  whereUsed: ContentUnitWhereUsedReference[];
  similar: SearchResultItem[];
  activityEvents: ActivityEvent[];
  similarHref: string;
}) {
  return (
    <>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden p-4">
          <ContentPreview title={previewTitle} previewUri={previewUri} big />
          <div className="mt-2 flex items-center justify-end">
            <button type="button" className="icon-btn" aria-label="Open full preview" disabled title="Full-screen preview coming soon">
              <ExternalLink size={12} aria-hidden="true" />
            </button>
          </div>
        </Card>

        <div>
          <OverviewPanelNav pageId={pageId} active={panel} versionId={version?.id} />

          <Card className="mt-3 p-4">
            {panel === "text" ? (
              <div className="grid gap-3">
                <TextPanel title="Extracted text" body={version?.extractedText} empty="No extracted text returned by the API." />
                <TextPanel title="Speaker notes" body={version?.speakerNotes} empty="No speaker notes returned by the API." />
              </div>
            ) : panel === "provenance" ? (
              <ProvenanceGrid provenance={provenance} version={version} slidePosition={slidePosition} tags={tags} />
            ) : panel === "relationships" ? (
              <RelationshipsPanel whereUsed={whereUsed} similar={similar} similarHref={similarHref} />
            ) : panel === "activity" ? (
              <ActivityTimeline events={activityEvents} />
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles size={14} color="var(--ai)" aria-hidden="true" />
                  <b className="text-[13px]">Summary</b>
                </div>
                {summary ? <ExpandableText text={summary} /> : <div className="text-sm text-[var(--ink-3)]">No AI summary available for this version yet.</div>}

                <div className="mb-2 mt-4 flex items-center gap-2">
                  <TagIcon size={14} color="var(--ink-3)" aria-hidden="true" />
                  <b className="text-[13px]">Tags</b>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.length === 0 ? (
                    <span className="muted text-xs">No tags yet.</span>
                  ) : (
                    tags.map((tag) => (
                      <Tag key={tag} tone="blue">
                        {tag}
                      </Tag>
                    ))
                  )}
                  <span className="tag" title="Taxonomy editing isn't available yet">
                    +
                  </span>
                </div>

                <div className="mb-2 mt-4 flex items-center gap-2">
                  <Shield size={14} color="var(--ok)" aria-hidden="true" />
                  <b className="text-[13px]">Trust &amp; Quality</b>
                </div>
                <TrustQualityCard version={version} provenance={provenance} />
              </>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={14} color="var(--ink-2)" aria-hidden="true" />
              <b>Slide variants &amp; similar versions</b>
              <span className="count-inline">{carouselCards.length}</span>
            </div>
            <div className="muted mt-0.5 text-xs">Explore alternate designs and related slides with similar content.</div>
          </div>
        </div>
        <VariantCarousel cards={carouselCards} ariaLabel="slide variants and similar versions" />
      </Card>

      <Card className="mt-3 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <b>
            Included in <span className="count-inline">{whereUsed.length}</span>
          </b>
          <a className="link flex items-center gap-1 text-sm" href={`/content-units/${pageId}?tab=overview&panel=relationships`}>
            View all relationships <ExternalLink size={10} aria-hidden="true" />
          </a>
        </div>
        <WhereUsedGrid items={whereUsed} />
      </Card>
    </>
  );
}
