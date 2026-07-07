"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Layers, Plus, Search } from "lucide-react";
import { useMySelection, type SelectionItem } from "@/components/selection";
import { Button, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { boxbrainApi } from "@/lib/api";
import { useLibraryCatalog } from "@/features/library/use-library-catalog";
import type { LibraryTabId } from "@/features/library/types";
import { ContentUnitLibraryView } from "./content-unit-view";
import { CatalogView } from "./catalog-view";
import { SimilarityPreviewRail } from "./similarity-rail";
import { InsightsRail } from "./insights-rail";
import { SearchResultsView } from "./search-results-view";
import { ContentUnitSelectionBar, CompareDrawer } from "./selection-dock";
import { PlaysPreviewPanel, CollectionsPreviewPanel } from "./static-preview-panels";

type Basis = { title: string; subtitle?: string; versionId?: string | null };

export function LibraryScreen() {
  const router = useRouter();
  const catalog = useLibraryCatalog();
  const mySelection = useMySelection();
  const [activeTab, setActiveTab] = useState<LibraryTabId>("contentUnits");
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  // Sidecar map (variantId -> resolvable content_unit_version id), in-memory only for this page
  // session. The shared My Selection store only persists {id, type, title, subtitle, thumb} to
  // localStorage, so a version id captured this session is required to build real storyboard slots.
  const [versionByVariant, setVersionByVariant] = useState<Record<string, string | null | undefined>>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const [basis, setBasis] = useState<Basis>({ title: "" });
  const [storyboardBusy, setStoryboardBusy] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  const onBasisChange = useCallback((next: Basis) => setBasis(next), []);

  const contentUnitSelections = mySelection.items.filter((item) => item.type === "contentunit");

  function toggleSelect(item: SelectionItem, versionId: string | null | undefined) {
    setVersionByVariant((prev) => ({ ...prev, [item.id]: versionId }));
    mySelection.toggle(item);
  }

  function isSelected(variantId: string) {
    return mySelection.has(variantId);
  }

  function clearContentUnitSelections() {
    contentUnitSelections.forEach((item) => mySelection.remove(item.id));
  }

  async function handleAddToStoryboard() {
    const withVersions = contentUnitSelections.filter((item) => Boolean(versionByVariant[item.id]));
    if (withVersions.length === 0) {
      setStoryboardError(
        contentUnitSelections.length === 0
          ? "Select at least one content unit first."
          : "None of the selected items resolved a version in this browsing session — reopen the family and add it again."
      );
      return;
    }
    setStoryboardBusy(true);
    setStoryboardError(null);
    try {
      const storyboard = await boxbrainApi.createStoryboard({ title: `Storyboard from Library — ${new Date().toLocaleDateString()}`, mode: "work_product" });
      const section = await boxbrainApi.createStoryboardSection(storyboard.id, { title: "From Library", orderIndex: 0 });
      let orderIndex = 0;
      for (const item of withVersions) {
        const versionId = versionByVariant[item.id];
        if (!versionId) continue;
        await boxbrainApi.createStoryboardSlot(section.id, {
          slotType: "content_unit",
          selectedObjectType: "content_unit_version",
          selectedObjectId: versionId,
          orderIndex: orderIndex++,
          isRequired: false
        });
      }
      router.push(`/storyboards/${storyboard.id}`);
    } catch (error) {
      setStoryboardError(error instanceof Error ? error.message : "Could not create a storyboard from this selection.");
    } finally {
      setStoryboardBusy(false);
    }
  }

  async function handleNewStoryboard() {
    setStoryboardBusy(true);
    setStoryboardError(null);
    try {
      const storyboard = await boxbrainApi.createStoryboard({ title: "Untitled Storyboard", mode: "work_product" });
      router.push(`/storyboards/${storyboard.id}`);
    } catch (error) {
      setStoryboardError(error instanceof Error ? error.message : "Could not create a new storyboard.");
    } finally {
      setStoryboardBusy(false);
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSubmittedQuery(searchInput.trim());
  }

  const isContentUnits = activeTab === "contentUnits";
  const insightsSourceItems =
    activeTab === "workProducts"
      ? catalog.workProducts.map((wp) => ({ statusChips: wp.statusChips }))
      : [
          ...catalog.families.map((family) => ({ statusChips: family.statusChips })),
          ...catalog.workProducts.map((wp) => ({ statusChips: wp.statusChips }))
        ];

  return (
    <div className="route-body" data-testid="library-page">
      <PageHeader
        eyebrow="Library"
        title={isContentUnits ? "Content Unit Library" : "Library"}
        description={isContentUnits ? "Find the right content — organized by family, variant, and version." : undefined}
        actions={
          !isContentUnits ? (
            <>
              <Button size="sm" onClick={handleNewStoryboard} disabled={storyboardBusy}>
                <Layers size={13} /> New Storyboard
              </Button>
              <Button variant="primary" size="sm" disabled title="Work Product creation has no backend endpoint yet.">
                <Plus size={13} /> New Work Product
              </Button>
            </>
          ) : undefined
        }
      />

      <form className="relative mb-1 max-w-xl" onSubmit={submitSearch} role="search">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" aria-hidden="true" />
        <input
          className="input pl-9"
          placeholder="Search content units, work products, or blocks…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search the Library"
        />
      </form>

      <Tabs
        tabs={[
          { id: "all", label: "All" },
          { id: "workProducts", label: "Work Products", count: catalog.workProducts.length || undefined },
          { id: "contentUnits", label: "Content Units", count: catalog.families.length || undefined },
          { id: "plays", label: "Plays" },
          { id: "collections", label: "Collections" }
        ]}
        active={activeTab}
        onChange={(id) => {
          setActiveTab(id as LibraryTabId);
          setSubmittedQuery("");
        }}
      />

      {storyboardError && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle size={16} /> {storyboardError}
        </div>
      )}

      <div className="mt-4">
        {submittedQuery ? (
          <SearchResultsView query={submittedQuery} onClear={() => setSubmittedQuery("")} />
        ) : catalog.state === "restricted" ? (
          <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Access restricted</div>
                <p className="m-0 mt-1 text-sm">No family titles, previews, snippets, or WorkProduct links are shown for restricted content.</p>
              </div>
            </div>
          </Card>
        ) : catalog.state === "error" ? (
          <Card className="border-red-200 bg-red-50 p-5 text-red-900">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Library request failed</div>
                <p className="m-0 mt-1 text-sm">{catalog.errorMessage ?? "The Library API request failed."}</p>
              </div>
            </div>
          </Card>
        ) : catalog.state === "loading" || catalog.state === "idle" ? (
          <div className="grid gap-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-32 animate-pulse rounded-lg bg-[var(--bg-2)]" />
            ))}
          </div>
        ) : activeTab === "plays" ? (
          <PlaysPreviewPanel />
        ) : activeTab === "collections" ? (
          <CollectionsPreviewPanel />
        ) : activeTab === "contentUnits" ? (
          catalog.families.length === 0 ? (
            <EmptyState title="No ContentUnit families returned" body="The Library API is reachable, but it did not return any visible family cards for this user and filter set." />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
              <ContentUnitLibraryView families={catalog.families} onToggleSelect={toggleSelect} onIsSelected={isSelected} onBasisChange={onBasisChange} />
              <SimilarityPreviewRail basisTitle={basis.title || undefined} basisSubtitle={basis.subtitle} versionId={basis.versionId} />
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
            <CatalogView scope={activeTab === "workProducts" ? "workProducts" : "all"} families={catalog.families} workProducts={catalog.workProducts} contentBlocks={catalog.contentBlocks} />
            <InsightsRail items={insightsSourceItems} />
          </div>
        )}
      </div>

      {isContentUnits && !submittedQuery && (
        <ContentUnitSelectionBar
          count={contentUnitSelections.length}
          onOpenSelection={mySelection.open}
          onClear={clearContentUnitSelections}
          onCompare={() => setCompareOpen(true)}
          onAddToStoryboard={handleAddToStoryboard}
          busy={storyboardBusy}
          errorMessage={null}
        />
      )}
      {compareOpen && (
        <CompareDrawer entries={contentUnitSelections} onClose={() => setCompareOpen(false)} onRemove={(id) => mySelection.remove(id)} />
      )}
    </div>
  );
}
