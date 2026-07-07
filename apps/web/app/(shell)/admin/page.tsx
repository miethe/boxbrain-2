import { Activity, AlertCircle, Clock3, Database, HardDrive, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, PageHeader, StatCard, StatusBadge, Tag } from "@/components/ui";
import { IngestionWorkspace } from "@/components/ingestion-workspace";
import { ApiError, boxbrainApi, type AdminHealth, type IngestionJob } from "@/lib/api";
import { AdminTabNav, resolveAdminTab } from "@/components/admin/tab-nav";
import { QueueHealthCard, RecentFailuresCard, StageHealthCard } from "@/components/admin/pipeline-health";
import { SearchEvalCard, SearchIndexCard } from "@/components/admin/search-index-card";
import { GuardrailsCard } from "@/components/admin/guardrails-card";
import { AuditLogCard, type AuditLogResult } from "@/components/admin/audit-log-card";
import { AdminSurfacesGrid } from "@/components/admin/admin-surfaces";
import { getRecentAuditEvents } from "@/features/admin/audit-events-api";
import { buildReadinessChecks, getHealthStages, summarizeJobs, type JobSummary } from "@/features/admin/lib";

type AdminReadinessResult =
  | {
      status: "ok";
      health: AdminHealth;
      ingestionJobs: IngestionJob[];
      auditLog: AuditLogResult;
    }
  | {
      status: "restricted";
    }
  | {
      status: "error";
      message: string;
    };

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const query = (await searchParams) ?? {};
  const activeTab = resolveAdminTab(query.tab);
  const result = await loadAdminReadiness();

  if (result.status === "restricted") return <RestrictedAdmin />;
  if (result.status === "error") return <AdminError message={result.message} />;

  const { health, ingestionJobs, auditLog } = result;
  const catalog = health.catalog ?? {};
  const composition = health.composition ?? {};
  const reviewAudit = health.reviewAudit ?? {};
  const ingestion = health.ingestion ?? {};
  const jobSummary = summarizeJobs(ingestionJobs);
  const statCards = [
    { label: "API health", value: health.status.toUpperCase(), hint: "FastAPI admin health endpoint", icon: Activity },
    { label: "Content units", value: String(catalog.contentUnitVersions ?? 0), hint: `${catalog.contentUnitFamilies ?? 0} governed families`, icon: Database },
    { label: "Composition", value: String(composition.storyboards ?? catalog.storyboards ?? 0), hint: `${composition.contentBlocks ?? catalog.contentBlocks ?? 0} ContentBlocks ready`, icon: HardDrive },
    { label: "Audit events", value: String(reviewAudit.auditEvents ?? 0), hint: "Governance mutations recorded", icon: KeyRound }
  ];
  const readinessChecks = buildReadinessChecks(health, ingestionJobs, jobSummary);

  return (
    <div className="route-body" data-testid="admin-page">
      <PageHeader
        eyebrow="Admin-lite"
        title="Pilot readiness observability"
        description="API-backed health, pipeline/queue, search-index/eval, audit-log, and restricted-content safeguards for pilot operators."
      />

      <div className="grid-auto mb-5" data-testid="admin-health-metrics">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <AdminTabNav active={activeTab} />

      {activeTab === "overview" && <OverviewTab readinessChecks={readinessChecks} ingestion={ingestion} queue={health.queue} ingestionJobs={ingestionJobs} jobSummary={jobSummary} />}

      {activeTab === "pipeline" && (
        <div className="grid gap-5" data-testid="admin-tab-panel-pipeline">
          <div className="two-col">
            <StageHealthCard stages={getHealthStages(health)} />
            <QueueHealthCard queue={health.queue} />
          </div>
          <RecentFailuresCard failures={health.ingestion?.recentFailures} />
        </div>
      )}

      {activeTab === "search-eval" && (
        <div className="two-col" data-testid="admin-tab-panel-search-eval">
          <SearchIndexCard searchIndex={health.searchIndex} />
          <SearchEvalCard searchEval={health.searchEval} />
        </div>
      )}

      {activeTab === "audit-log" && (
        <div data-testid="admin-tab-panel-audit-log">
          <AuditLogCard result={auditLog} />
        </div>
      )}

      {activeTab === "surfaces" && (
        <div data-testid="admin-tab-panel-surfaces">
          <AdminSurfacesGrid />
        </div>
      )}

      <GuardrailsCard health={health} />

      <div className="mt-5" data-testid="admin-ingestion-workspace">
        <IngestionWorkspace />
      </div>
    </div>
  );
}

function OverviewTab({
  readinessChecks,
  ingestion,
  queue,
  ingestionJobs,
  jobSummary
}: {
  readinessChecks: ReturnType<typeof buildReadinessChecks>;
  ingestion: AdminHealth["ingestion"];
  queue: AdminHealth["queue"];
  ingestionJobs: IngestionJob[];
  jobSummary: JobSummary;
}) {
  return (
    <div className="two-col" data-testid="admin-tab-panel-overview">
      <Card className="p-4" data-testid="admin-readiness-checks">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} color="var(--ok)" /> Readiness checks
        </div>
        <div className="grid gap-2">
          {readinessChecks.map((check) => (
            <div key={check.label} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">{check.label}</div>
                <StatusBadge tone={check.tone}>{check.value}</StatusBadge>
              </div>
              <p className="m-0 mt-1 text-sm text-slate-500">{check.hint}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4" data-testid="admin-ingestion-observability">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Clock3 size={16} /> Ingestion observability
        </div>
        {ingestionJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">
            <div className="text-sm font-bold text-slate-800">No ingestion telemetry returned</div>
            <p className="m-0 mt-1 text-sm text-slate-500">The Admin health API is reachable, but no ingestion jobs are visible for this workspace yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric label="Queued" value={jobSummary.queued} tone="neutral" />
              <MiniMetric label="Running" value={jobSummary.running} tone="warn" />
              <MiniMetric label="Complete" value={jobSummary.complete} tone="ok" />
              <MiniMetric label="Failed" value={jobSummary.failed} tone="danger" />
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
              <div className="font-bold text-slate-900">Oldest active job</div>
              <div className="mt-1">{jobSummary.oldestActiveAge ?? "No queued or running jobs."}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag>{ingestion?.totalJobs ?? ingestionJobs.length} total jobs</Tag>
              <Tag tone={jobSummary.failed > 0 ? "danger" : "ok"}>{jobSummary.failed} failed</Tag>
              {queue?.status && <Tag tone={queue.status === "healthy" ? "ok" : "warn"}>{queue.status}</Tag>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

async function loadAdminReadiness(): Promise<AdminReadinessResult> {
  try {
    const [health, ingestionResult] = await Promise.all([boxbrainApi.getAdminHealth(), boxbrainApi.listIngestionJobs()]);
    return {
      status: "ok",
      health,
      ingestionJobs: ingestionResult.items,
      auditLog: await loadAuditLog()
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The Admin readiness API request failed." };
  }
}

/** Isolated so an audit-events-specific failure only degrades the Audit Log tab, not the whole
 * Admin dashboard (health + ingestion jobs still render even if this call fails independently). */
async function loadAuditLog(): Promise<AuditLogResult> {
  try {
    const events = await getRecentAuditEvents();
    return { status: "ok", events };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The audit events API request failed." };
  }
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" | "neutral" }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-xl font-black text-slate-950">{value}</div>
        <StatusBadge tone={tone}>{label.toLowerCase()}</StatusBadge>
      </div>
    </div>
  );
}

function RestrictedAdmin() {
  return (
    <div className="route-body" data-testid="admin-restricted">
      <PageHeader eyebrow="Admin-lite" title="Admin access required" description="The current user cannot view pilot readiness health, audit, or queue observability." />
      <Card className="p-5">
        <div className="flex items-start gap-3 text-slate-700">
          <ShieldAlert size={18} className="mt-0.5 text-amber-600" />
          <div>
            <div className="text-sm font-bold">Restricted readiness surface</div>
            <p className="m-0 mt-1 text-sm text-slate-500">Admin permissions are required before health, queue, audit, or restricted-content diagnostics are displayed.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="route-body" data-testid="admin-error">
      <PageHeader eyebrow="Admin-lite" title="Readiness API unavailable" description="The live Admin observability API could not be loaded." />
      <Card className="p-5">
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle size={18} className="mt-0.5" />
          <div>
            <div className="text-sm font-bold">Admin health request failed</div>
            <p className="m-0 mt-1 text-sm text-red-700">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
