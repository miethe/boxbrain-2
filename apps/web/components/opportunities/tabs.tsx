import Link from "next/link";

export type OpportunityTabKey = "workspace" | "storyboard" | "insights" | "requirements" | "messages" | "activity";

const tabs: Array<{ key: OpportunityTabKey; label: string }> = [
  { key: "workspace", label: "Workspace" },
  { key: "storyboard", label: "Storyboard" },
  { key: "insights", label: "Insights" },
  { key: "requirements", label: "Requirements" },
  { key: "messages", label: "Messages" },
  { key: "activity", label: "Activity" }
];

export const knownOpportunityTabs: OpportunityTabKey[] = tabs.map((tab) => tab.key);

export function OpportunityTabNav({ active }: { active: OpportunityTabKey }) {
  return (
    <div className="tabs mt-3" role="tablist" aria-label="Opportunity sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/opportunities?tab=${tab.key}`}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          data-testid={`opportunity-tab-${tab.key}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
