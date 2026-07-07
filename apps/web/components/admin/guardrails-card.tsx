import { ShieldAlert } from "lucide-react";
import { Card, SectionHead, StatusBadge } from "@/components/ui";
import type { AdminHealth } from "@/lib/api";
import { buildGuardrailChecks } from "@/features/admin/lib";

/** Live-data guardrails summary. Previously four hardcoded descriptive sentences with a permanent
 * green "ready" badge regardless of system state (audit-digest.md ## admin-ingestion, gap
 * "'Restricted-content guardrails' card is static marketing copy, not live data"); now every line
 * is computed from the current `AdminHealth` payload. */
export function GuardrailsCard({ health }: { health: AdminHealth }) {
  const checks = buildGuardrailChecks(health);

  return (
    <Card className="mt-5 p-4" data-testid="admin-guardrails">
      <SectionHead>
        <ShieldAlert size={16} className="mr-1.5 inline align-[-3px] text-amber-600" aria-hidden="true" /> Restricted-content guardrails
      </SectionHead>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-900">{check.label}</div>
              <StatusBadge tone={check.tone}>{check.value}</StatusBadge>
            </div>
            <p className="m-0 mt-1 text-slate-600">{check.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
