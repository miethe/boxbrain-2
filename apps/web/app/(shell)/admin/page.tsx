import { Activity, AlertCircle, Clock3, Database, HardDrive, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, PageHeader, StatCard, StatusBadge, Tag } from "@/components/ui";
import { IngestionWorkspace } from "@/components/ingestion-workspace";
import { ApiError, boxbrainApi, type AdminHealth, type IngestionJob, type IngestionJobStatus } from "@/lib/api";

type AdminReadinessResult =
  | {
      status: "ok";
      health: AdminHealth;
      ingestionJobs: IngestionJob[];
    }
  | {
      status: "restricted";
    }
  | {
      status: "error";
      message: string;
    };

type ReadinessCheck = {
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "danger" | "neutral";
};

export default async function AdminPage() {
  const result = await loadAdminReadiness();

  if (result.status === "restricted") return <RestrictedAdmin />;
  if (result.status === "error") return <AdminError message={result.message} />;

  const catalog = result.health.catalog ?? {};
  const composition = result.health.composition ?? {};
  const reviewAudit = result.health.reviewAudit ?? {};
  const ingestion = result.health.ingestion ?? {};
  const jobSummary = summarizeJobs(result.ingestionJobs);
  const statCards = [
    { label: "API health", value: result.health.status.toUpperCase(), hint: "FastAPI admin health endpoint", icon: Activity },
    { label: "Content units", value: String(catalog.contentUnitVersions ?? 0), hint: `${catalog.contentUnitFamilies ?? 0} governed families`, icon: Database },
    { label: "Composition", value: String(composition.storyboards ?? catalog.storyboards ?? 0), hint: `${composition.contentBlocks ?? catalog.contentBlocks ?? 0} ContentBlocks ready`, icon: HardDrive },
    { label: "Audit events", value: String(reviewAudit.auditEvents ?? 0), hint: "Governance mutations recorded", icon: KeyRound }
  ];
  const readinessChecks = buildReadinessChecks(result.health, result.ingestionJobs, jobSummary);

  return (
    <div className="route-body" data-testid="admin-page">
      <PageHeader
        eyebrow="Admin-lite"
        title="Pilot readiness observability"
        description="API-backed health, ingestion, review, composition, audit, and restricted-content safeguards for pilot operators."
      />

      <div className="grid-auto mb-5" data-testid="admin-health-metrics">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="two-col">
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
          {result.ingestionJobs.length === 0 ? (
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
                <Tag>{ingestion.totalJobs ?? result.ingestionJobs.length} total jobs</Tag>
                <Tag tone={jobSummary.failed > 0 ? "danger" : "ok"}>{jobSummary.failed} failed</Tag>
                {result.health.queue?.status && <Tag tone={result.health.queue.status === "healthy" ? "ok" : "warn"}>{result.health.queue.status}</Tag>}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-4" data-testid="admin-guardrails">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ShieldAlert size={16} className="text-amber-600" /> Restricted-content guardrails
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            "Search, thumbnails, snippets, where-used, and similarity output use restricted filters before display.",
            "Governance actions keep AI suggestions as reviewable candidates until an authorized reviewer acts.",
            "Storyboards and ContentBlocks preserve ordered composition while retaining source provenance.",
            "Audit counts are loaded from the live Admin health endpoint for pilot readiness checks."
          ].map((check) => (
            <div key={check} className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <StatusBadge tone="ok">ready</StatusBadge> <span className="ml-2">{check}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5" data-testid="admin-ingestion-workspace">
        <IngestionWorkspace />
      </div>
    </div>
  );
}

async function loadAdminReadiness(): Promise<AdminReadinessResult> {
  try {
    const [health, ingestionResult] = await Promise.all([boxbrainApi.getAdminHealth(), boxbrainApi.listIngestionJobs()]);
    return {
      status: "ok",
      health,
      ingestionJobs: ingestionResult.items
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The Admin readiness API request failed." };
  }
}

function buildReadinessChecks(health: AdminHealth, ingestionJobs: IngestionJob[], jobSummary: ReturnType<typeof summarizeJobs>): ReadinessCheck[] {
  const catalog = health.catalog ?? {};
  const composition = health.composition ?? {};
  const reviewAudit = health.reviewAudit ?? {};
  const ingestion = health.ingestion ?? {};
  const hasCatalog = (catalog.contentUnitFamilies ?? 0) > 0 && (catalog.contentUnitVersions ?? 0) > 0;
  const hasComposition = (composition.contentBlocks ?? catalog.contentBlocks ?? 0) > 0 && (composition.storyboards ?? catalog.storyboards ?? 0) > 0;
  const hasIngestion = (ingestion.totalJobs ?? 0) > 0 || ingestionJobs.length > 0;

  return [
    {
      label: "Catalog telemetry",
      value: hasCatalog ? "ready" : "empty",
      hint: `${catalog.contentUnitFamilies ?? 0} families and ${catalog.contentUnitVersions ?? 0} versions returned by Admin health.`,
      tone: hasCatalog ? "ok" : "warn"
    },
    {
      label: "Composition telemetry",
      value: hasComposition ? "ready" : "empty",
      hint: `${composition.contentBlocks ?? catalog.contentBlocks ?? 0} ContentBlocks and ${composition.storyboards ?? catalog.storyboards ?? 0} Storyboards returned by Admin health.`,
      tone: hasComposition ? "ok" : "warn"
    },
    {
      label: "Ingestion telemetry",
      value: jobSummary.failed > 0 ? "attention" : hasIngestion ? "ready" : "empty",
      hint: `${ingestionJobs.length} visible jobs with ${jobSummary.running} running and ${jobSummary.failed} failed.`,
      tone: jobSummary.failed > 0 ? "danger" : hasIngestion ? "ok" : "warn"
    },
    {
      label: "Audit telemetry",
      value: (reviewAudit.auditEvents ?? 0) > 0 ? "ready" : "empty",
      hint: `${reviewAudit.auditEvents ?? 0} audit events are visible to the pilot readiness surface; ${reviewAudit.openReviewItems ?? 0} review items remain open.`,
      tone: (reviewAudit.auditEvents ?? 0) > 0 ? "ok" : "warn"
    }
  ];
}

function summarizeJobs(jobs: IngestionJob[]) {
  const counts: Record<IngestionJobStatus, number> = {
    queued: 0,
    running: 0,
    failed: 0,
    complete: 0
  };
  for (const job of jobs) counts[job.status] += 1;

  const oldestActive = jobs
    .filter((job) => job.status === "queued" || job.status === "running")
    .map((job) => new Date(job.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())[0];

  return {
    ...counts,
    oldestActiveAge: oldestActive ? formatAge(oldestActive) : null
  };
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

function formatAge(date: Date) {
  const elapsedMs = Date.now() - date.getTime();
  if (elapsedMs < 0) return "Scheduled in the future";
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return "Less than 1 minute old";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} old`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} old`;
}
