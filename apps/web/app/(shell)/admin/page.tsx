import { Activity, Database, HardDrive, KeyRound, ShieldCheck } from "lucide-react";
import { Card, PageHeader, StatCard, StatusBadge, Tag } from "@/components/ui";
import { IngestionWorkspace } from "@/components/ingestion-workspace";

const adminStats = [
  { label: "API health", value: "OK", hint: "FastAPI reachable in local mode", icon: Activity },
  { label: "Postgres", value: "pgvector", hint: "metadata, graph, search vectors", icon: Database },
  { label: "Storage", value: "MinIO", hint: "S3-compatible artifact store", icon: HardDrive },
  { label: "Authz", value: "Local", hint: "current-user role plumbing", icon: KeyRound }
];

export default function AdminPage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Admin-lite"
        title="System controls and governance readiness"
        description="Initial admin surface for ingestion health, roles, storage, contracts, and restricted-content safeguards."
      />
      <div className="grid-auto mb-5">
        {adminStats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
      <div className="two-col">
        <Card className="p-4">
          <h2 className="m-0 text-base font-bold">Role model foundation</h2>
          <div className="mt-3 grid gap-2">
            {["Viewer", "Contributor", "Curator", "Reviewer", "Admin"].map((role) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div className="font-semibold">{role}</div>
                <Tag>seeded</Tag>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} color="var(--ok)" /> Guardrail checks
          </div>
          {[
            "Restricted content filtered before ranking",
            "Governance actions write audit events",
            "Storyboard snapshots cannot be mutated",
            "AI outputs create review candidates only"
          ].map((check) => (
            <div key={check} className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <StatusBadge tone="ok">ready</StatusBadge> <span className="ml-2">{check}</span>
            </div>
          ))}
        </Card>
      </div>
      <div className="mt-5">
        <IngestionWorkspace />
      </div>
    </div>
  );
}
