import Link from "next/link";

export type AdminTabKey = "overview" | "pipeline" | "search-eval" | "audit-log" | "surfaces";

export const ADMIN_TABS: Array<{ key: AdminTabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "pipeline", label: "Pipeline & Queue" },
  { key: "search-eval", label: "Search & Eval" },
  { key: "audit-log", label: "Audit Log" },
  { key: "surfaces", label: "Admin Surfaces" }
];

export function resolveAdminTab(value?: string): AdminTabKey {
  return ADMIN_TABS.some((tab) => tab.key === value) ? (value as AdminTabKey) : "overview";
}

/** Server-renderable tabs (query-param driven, no client JS) mirroring the pattern established by
 * `components/content-units/tab-nav.tsx`'s `ContentUnitTabNav`, so the Admin dashboard's five
 * sub-sections stay deep-linkable and keep working with `/admin` navigating straight to Overview. */
export function AdminTabNav({ active }: { active: AdminTabKey }) {
  return (
    <div className="tabs mb-5" role="tablist" aria-label="Admin dashboard sections" data-testid="admin-tab-nav">
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "overview" ? "/admin" : `/admin?tab=${tab.key}`}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          data-testid={`admin-tab-${tab.key}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
