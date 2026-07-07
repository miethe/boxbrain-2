import { Card, EmptyState, InfoBanner } from "@/components/ui";
import { opportunity } from "@/features/opportunities/data";
import { OpportunityHeader } from "@/components/opportunities/header";
import { OpportunityTabNav, knownOpportunityTabs, type OpportunityTabKey } from "@/components/opportunities/tabs";
import { ContextPanel } from "@/components/opportunities/context-panel";
import { WorkspaceInsights } from "@/components/opportunities/workspace-insights";
import { SavedMaterials } from "@/components/opportunities/saved-materials";
import { PlayBuilder } from "@/components/opportunities/play-builder";

const tabCopy: Record<Exclude<OpportunityTabKey, "workspace">, { title: string; body: string }> = {
  storyboard: { title: "Storyboard — not available in this preview", body: "Linking a real Storyboard to this preview opportunity requires an Opportunity domain model, which does not exist yet (see audit-digest.md#home-plays-opps)." },
  insights: { title: "Insights — not available in this preview", body: "Deal-level insights require historical outcome telemetry that this preview surface does not have." },
  requirements: { title: "Requirements — not available in this preview", body: "Requirements tracking is not part of the seeded preview dataset yet." },
  messages: { title: "Messages — not available in this preview", body: "Opportunity messaging is a separate concept from ContentUnit comments and is not wired yet." },
  activity: { title: "Activity — not available in this preview", body: "A full opportunity audit trail requires the Opportunity domain model, which does not exist yet." }
};

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const query = (await searchParams) ?? {};
  const activeTab = (knownOpportunityTabs as string[]).includes(query.tab ?? "") ? (query.tab as OpportunityTabKey) : "workspace";

  return (
    <div className="route-body" data-testid="opportunities-page">
      <InfoBanner tone="ai">
        Opportunities is a preview surface backed by local seed data — there is no live Opportunity, Deal Health, or AI recommendation backend yet. Browsing is real; actions here are illustrative only.
      </InfoBanner>

      <div className="mt-4">
        <OpportunityHeader opportunity={opportunity} />
        <OpportunityTabNav active={activeTab} />
      </div>

      {activeTab === "workspace" ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px_minmax(0,1fr)]" data-testid="opportunity-workspace">
          <ContextPanel opportunity={opportunity} />
          <WorkspaceInsights />
          <SavedMaterials />
          <PlayBuilder />
        </div>
      ) : (
        <Card className="mt-4 p-4">
          <EmptyState title={tabCopy[activeTab].title} body={tabCopy[activeTab].body} />
        </Card>
      )}
    </div>
  );
}
