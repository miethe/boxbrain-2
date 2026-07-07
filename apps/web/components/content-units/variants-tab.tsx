import Link from "next/link";
import { Card, EmptyState, ScorePill } from "@/components/ui";
import type { Comment, ContentUnitVersionDetail, ContentUnitWhereUsedReference, Note, ProvenanceRecord, SearchResultItem } from "@/lib/api";
import type { FlatVersion, SlidePosition } from "@/features/content-units/lib";
import { normalizeScore, scoreDescriptor } from "@/features/content-units/lib";
import { VersionsRail } from "./versions-rail";
import { VariantsExplorer } from "./variants-explorer";
import { ProvenanceGrid } from "./provenance-grid";
import { RatingsQualityCard } from "./ratings-quality";
import { UsageStatsCard } from "./usage-stats-card";
import { AiInsightsCard } from "./ai-insights-card";
import { SimilarityList } from "./similarity-list";
import { CommentThread } from "./comment-thread";
import { NotesList, AddNoteForm } from "./notes-panel";
import { WhereUsedList } from "./where-used-list";

export function VariantsTab({
  pageId,
  hasFamily,
  version,
  previewSubtitle,
  sourceDocName,
  flatVersions,
  provenance,
  slidePosition,
  tags,
  comments,
  notes,
  similar,
  whereUsed,
  variationExplorerHref,
  similarHref,
  commentsHref,
  notesHref,
  versionsHref,
  createCommentAction,
  createNoteAction
}: {
  pageId: string;
  hasFamily: boolean;
  version?: ContentUnitVersionDetail;
  previewSubtitle?: string | null;
  sourceDocName?: string | null;
  flatVersions: FlatVersion[];
  provenance?: ProvenanceRecord;
  slidePosition?: SlidePosition | null;
  tags: string[];
  comments: Comment[];
  notes: Note[];
  similar: SearchResultItem[];
  whereUsed: ContentUnitWhereUsedReference[];
  variationExplorerHref: string;
  similarHref: string;
  commentsHref: string;
  notesHref: string;
  versionsHref: string;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  createNoteAction: (formData: FormData) => void | Promise<void>;
}) {
  const quality = normalizeScore(version?.qualityScore);
  const usage = normalizeScore(version?.usageScore);

  if (!hasFamily) {
    return (
      <div className="mt-5">
        <EmptyState
          title="No variant/version family to explore"
          body="This identifier resolved to a standalone ContentUnit version with no discoverable sibling variants. Variant and version history requires a resolvable ContentUnit family."
        />
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)_320px_220px] lg:items-start">
      <VersionsRail entries={flatVersions} selectedVersionId={version?.id} pageId={pageId} versionsHref={versionsHref} />

      <div>
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <h2 className="m-0 text-2xl font-bold leading-tight tracking-tight text-[var(--ink)]">{version?.summary ?? "Untitled ContentUnit"}</h2>
              {previewSubtitle && <div className="muted mt-2 text-sm">{previewSubtitle}</div>}
              <div className="muted mono mt-3.5 text-[10px]">{sourceDocName ?? "No parent work product returned"}</div>
            </div>
            <div className="grid gap-2 justify-items-end text-right">
              {quality != null && <ScorePill value={quality} label={scoreDescriptor(quality, "quality")} />}
              {usage != null && <ScorePill value={usage} label={scoreDescriptor(usage, "usage")} />}
            </div>
          </div>
        </Card>

        <Card className="mt-3 p-4">
          <VariantsExplorer pageId={pageId} entries={flatVersions} selectedVersionId={version?.id} variationExplorerHref={variationExplorerHref} />
        </Card>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card className="p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <b className="text-[13px]">Similarity Matches</b>
              <Link href={similarHref} className="link text-xs">
                View all
              </Link>
            </div>
            <SimilarityList items={similar} limit={5} />
          </Card>
          <Card className="p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <b className="text-[13px]">Comments</b>
              <Link href={commentsHref} className="link text-xs">
                View all ({comments.length})
              </Link>
            </div>
            {version && <CommentThread comments={comments} pageId={pageId} versionId={version.id} createCommentAction={createCommentAction} limit={2} />}
          </Card>
        </div>

        <Card className="mt-3 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <b className="text-[13px]">
              Notes <span className="count-inline">{notes.length}</span>
            </b>
            <Link href={notesHref} className="link text-xs">
              View all
            </Link>
          </div>
          <NotesList notes={notes} limit={2} />
        </Card>
      </div>

      <div className="grid content-start gap-3">
        <Card className="p-3.5">
          <b className="text-[13px]">Provenance</b>
          <div className="mt-2">
            <ProvenanceGrid provenance={provenance} version={version} slidePosition={slidePosition} tags={tags} />
          </div>
        </Card>
        <Card className="p-3.5">
          <b className="text-[13px]">Ratings &amp; Quality</b>
          <div className="mt-2">
            <RatingsQualityCard qualityScore={version?.qualityScore} usageScore={version?.usageScore} />
          </div>
        </Card>
        <Card className="p-3.5">
          <UsageStatsCard />
        </Card>
        {version && (
          <Card className="p-3.5">
            <div className="mb-2 text-[13px] font-bold">Add a note</div>
            <AddNoteForm pageId={pageId} versionId={version.id} createNoteAction={createNoteAction} />
          </Card>
        )}
      </div>

      <div className="grid content-start gap-3">
        <Card className="p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[13px]">
              Where used <span className="count-inline">{whereUsed.length}</span>
            </b>
            <Link href={`/content-units/${pageId}?tab=overview&panel=relationships`} className="link text-[11px]">
              View all
            </Link>
          </div>
          <WhereUsedList items={whereUsed} limit={3} />
        </Card>
        <AiInsightsCard />
      </div>
    </div>
  );
}
