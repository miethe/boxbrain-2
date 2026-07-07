import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Card, EmptyState, InfoBanner } from "@/components/ui";
import { getPlayById, getSimilarPlays } from "@/features/plays/data";
import { PlayHeader } from "@/components/plays/play-header";
import { PlayStatsBar } from "@/components/plays/play-stats-bar";
import { PlayInfoGrid } from "@/components/plays/play-info-grid";
import { PlayFlow } from "@/components/plays/play-flow";
import { PlaySidebar } from "@/components/plays/play-sidebar";
import { knownPlayTabs, PlayTabNav, type PlayTabKey } from "@/components/plays/play-tabs";

const tabCopy: Record<Exclude<PlayTabKey, "flow">, { title: string; body: string }> = {
  rationale: { title: "Rationale — not available in this preview", body: "The strategic rationale narrative for this play is not part of the seeded preview dataset yet." },
  opportunities: { title: "Related Opportunities — not available in this preview", body: "Linking Plays to real Opportunity records requires the Opportunity domain model, which does not exist yet (see audit-digest.md#home-plays-opps)." },
  assets: { title: "Assets — not available in this preview", body: "Attaching real ContentUnits and WorkProducts to a Play requires a backend Play↔asset relationship, which does not exist yet." },
  outcomes: { title: "Outcome Metrics — not available in this preview", body: "Outcome tracking requires production usage telemetry that this preview surface does not have." },
  reviews: { title: "Reviews — not available in this preview", body: "Play-specific reviews are a separate concept from the ContentUnit review queue and are not wired yet." }
};

export default async function PlayDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const play = getPlayById(id);

  if (!play) return <PlayNotFound />;

  const activeTab = (knownPlayTabs as string[]).includes(query.tab ?? "") ? (query.tab as PlayTabKey) : "flow";
  const similarPlays = getSimilarPlays(play);

  return (
    <div className="route-body" data-testid="play-detail-page">
      <InfoBanner tone="ai">
        This Play is a preview surface backed by local seed data. Usage figures, AI guidance, and actions here are illustrative, not live analytics.
      </InfoBanner>

      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <PlayHeader play={play} />
          <PlayStatsBar stats={play.stats} />
          <PlayInfoGrid play={play} />

          <PlayTabNav playId={play.id} active={activeTab} />

          {activeTab === "flow" ? (
            <Card className="mt-3 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <b className="text-sm">Recommended Flow</b>
                  <p className="m-0 mt-0.5 text-xs text-slate-500">A proven sequence of steps to drive executive alignment and expand account value.</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" aria-disabled="true" title="Flow diagram view is illustrative in this preview">
                  <Layers size={13} aria-hidden="true" /> View as Flow
                </button>
              </div>
              <PlayFlow steps={play.steps} />
              <button type="button" className="btn btn-ghost mt-2 self-start" aria-disabled="true" title="Adding steps is not available in this preview">
                <Plus size={13} aria-hidden="true" /> Add Step
              </button>
            </Card>
          ) : (
            <Card className="mt-3 p-4">
              <EmptyState title={tabCopy[activeTab].title} body={tabCopy[activeTab].body} />
            </Card>
          )}
        </div>

        <PlaySidebar similarPlays={similarPlays} />
      </div>
    </div>
  );
}

function PlayNotFound() {
  return (
    <div className="route-body" data-testid="play-not-found">
      <InfoBanner tone="warn">This Play is a preview surface backed by local seed data.</InfoBanner>
      <Card className="mt-4 p-6 text-center">
        <div className="text-sm font-bold text-slate-800">Play not found</div>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">This preview Play does not exist. Browse the current preview catalog instead.</p>
        <Link href="/plays" className="btn btn-primary mt-4 inline-flex">
          Back to Plays
        </Link>
      </Card>
    </div>
  );
}
