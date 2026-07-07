import Link from "next/link";
import { playCategoryLabels, type PlayCategory } from "@/features/plays/data";

const categoryOrder: PlayCategory[] = ["growth", "expansion", "cross-sell", "retention"];

export function PlaysCategoryTabs({ active, counts }: { active: string; counts: Record<"all" | PlayCategory, number> }) {
  const tabs: Array<{ key: "all" | PlayCategory; label: string }> = [
    { key: "all", label: "All Plays" },
    ...categoryOrder.map((key) => ({ key, label: playCategoryLabels[key] }))
  ];

  return (
    <div className="tabs mt-3" role="tablist" aria-label="Play categories">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "all" ? "/plays" : `/plays?category=${tab.key}`}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          data-testid={`plays-tab-${tab.key}`}
        >
          {tab.label} <span className="count-inline">{counts[tab.key]}</span>
        </Link>
      ))}
    </div>
  );
}
