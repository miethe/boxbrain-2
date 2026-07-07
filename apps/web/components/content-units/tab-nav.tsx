import Link from "next/link";

export type ContentUnitTabKey = "overview" | "variants" | "versions" | "similar" | "comments" | "notes" | "activity";

export function buildTabHref(pageId: string, tab: ContentUnitTabKey, versionId?: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (versionId) params.set("version", versionId);
  return `/content-units/${pageId}?${params.toString()}`;
}

export function ContentUnitTabNav({
  pageId,
  active,
  versionId,
  counts
}: {
  pageId: string;
  active: ContentUnitTabKey;
  versionId?: string;
  counts: { comments: number; notes: number };
}) {
  const tabs: Array<{ key: ContentUnitTabKey; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    { key: "variants", label: "Variants" },
    { key: "versions", label: "Versions" },
    { key: "similar", label: "Similar" },
    { key: "comments", label: "Comments", count: counts.comments },
    { key: "notes", label: "Notes", count: counts.notes },
    { key: "activity", label: "Activity" }
  ];

  return (
    <div className="tabs mt-4" role="tablist" aria-label="ContentUnit sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={buildTabHref(pageId, tab.key, versionId)}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          data-testid={`content-unit-tab-${tab.key}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="count-inline">{tab.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export type OverviewPanelKey = "overview" | "text" | "provenance" | "relationships" | "activity";

export function buildPanelHref(pageId: string, panel: OverviewPanelKey, versionId?: string) {
  const params = new URLSearchParams();
  params.set("tab", "overview");
  params.set("panel", panel);
  if (versionId) params.set("version", versionId);
  return `/content-units/${pageId}?${params.toString()}`;
}

export function OverviewPanelNav({ pageId, active, versionId }: { pageId: string; active: OverviewPanelKey; versionId?: string }) {
  const panels: Array<{ key: OverviewPanelKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "text", label: "Text" },
    { key: "provenance", label: "Provenance" },
    { key: "relationships", label: "Relationships" },
    { key: "activity", label: "Activity" }
  ];
  return (
    <div className="tabs" role="tablist" aria-label="ContentUnit overview panels">
      {panels.map((panel) => (
        <Link
          key={panel.key}
          href={buildPanelHref(pageId, panel.key, versionId)}
          role="tab"
          aria-selected={active === panel.key}
          className={`tab ${active === panel.key ? "active" : ""}`}
          data-testid={`content-unit-panel-${panel.key}`}
        >
          {panel.label}
        </Link>
      ))}
    </div>
  );
}
