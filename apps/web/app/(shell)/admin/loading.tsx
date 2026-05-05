import { Activity, Database, HardDrive, KeyRound } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/ui";

const loadingStats = [
  { label: "API health", value: "...", hint: "Loading Admin health", icon: Activity },
  { label: "Content units", value: "...", hint: "Loading catalog telemetry", icon: Database },
  { label: "Composition", value: "...", hint: "Loading composition telemetry", icon: HardDrive },
  { label: "Audit events", value: "...", hint: "Loading governance telemetry", icon: KeyRound }
];

export default function AdminLoading() {
  return (
    <div className="route-body" data-testid="admin-loading">
      <PageHeader eyebrow="Admin-lite" title="Pilot readiness observability" description="Loading live health, ingestion, audit, and guardrail telemetry." />
      <div className="grid-auto mb-5">
        {loadingStats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
      <div className="two-col">
        <Card className="h-64 animate-pulse bg-slate-100">
          <span className="sr-only">Loading readiness checks</span>
        </Card>
        <Card className="h-64 animate-pulse bg-slate-100">
          <span className="sr-only">Loading ingestion observability</span>
        </Card>
      </div>
    </div>
  );
}
