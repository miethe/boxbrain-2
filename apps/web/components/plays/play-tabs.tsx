import Link from "next/link";

export type PlayTabKey = "flow" | "rationale" | "opportunities" | "assets" | "outcomes" | "reviews";

const tabs: Array<{ key: PlayTabKey; label: string }> = [
  { key: "flow", label: "Play Flow" },
  { key: "rationale", label: "Rationale" },
  { key: "opportunities", label: "Related Opportunities" },
  { key: "assets", label: "Assets" },
  { key: "outcomes", label: "Outcome Metrics" },
  { key: "reviews", label: "Reviews" }
];

export const knownPlayTabs: PlayTabKey[] = tabs.map((tab) => tab.key);

export function PlayTabNav({ playId, active }: { playId: string; active: PlayTabKey }) {
  return (
    <div className="tabs mt-4" role="tablist" aria-label="Play sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/plays/${playId}?tab=${tab.key}`}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          data-testid={`play-tab-${tab.key}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
