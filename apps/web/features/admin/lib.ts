// Pure, framework-free helpers for the Admin dashboard. Kept dependency-free so they are cheap to
// unit test in isolation from React, Next.js, and the live API.
// Design truth: no dedicated Admin mock-up exists (docs/project_plans/uplift/screen-wave-brief.md);
// this reuses the repo's status-chip/stat-card vocabulary (apps/web/components/ui.tsx,
// apps/web/app/globals.css) driven entirely by the real `AdminHealth` payload
// (services/api/app/schemas/api.py::AdminHealth) so nothing here fabricates data.
import type { AdminHealth, IngestionJob, IngestionJobStatus } from "@/lib/api";
import type { AuditEvent } from "./audit-events-api";

export type Tone = "ok" | "warn" | "danger" | "ai" | "primary" | "neutral";

export type ReadinessCheck = {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
};

export type JobSummary = Record<IngestionJobStatus, number> & { oldestActiveAge: string | null };

export function summarizeJobs(jobs: IngestionJob[]): JobSummary {
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

export function formatAge(date: Date): string {
  const elapsedMs = Date.now() - date.getTime();
  if (elapsedMs < 0) return "Scheduled in the future";
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return "Less than 1 minute old";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} old`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} old`;
}

export function buildReadinessChecks(health: AdminHealth, ingestionJobs: IngestionJob[], jobSummary: JobSummary): ReadinessCheck[] {
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

// --- Safe accessors for AdminHealth sub-object fields that are captured only by an index
// signature (`[key: string]: unknown`) in `lib/api.ts`, or missing from the TS type entirely even
// though the live API returns them (see `getHealthStages` below). These never throw and never
// invent a value: an unexpected shape just normalizes to the empty/zero case. ---
function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "number") result[key] = item;
  }
  return result;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export type SearchEvalCase = {
  name: string;
  query: string;
  role: string;
  resultCount: number;
  topScore: number | null;
  topTitle: string | null;
  passed: boolean;
  notes: string[];
};

/** `AdminHealth.searchEval.cases` is typed `unknown[]` in `lib/api.ts` (it was added but never
 * fully typed - audit-digest.md ## admin-ingestion). Normalize defensively instead of trusting the
 * shape, so a malformed case entry degrades to safe defaults rather than throwing. */
export function normalizeSearchEvalCases(cases: unknown[] | undefined): SearchEvalCase[] {
  if (!Array.isArray(cases)) return [];
  return cases.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      name: typeof item.name === "string" ? item.name : "unnamed_case",
      query: typeof item.query === "string" ? item.query : "",
      role: typeof item.role === "string" ? item.role : "viewer",
      resultCount: asNumber(item.resultCount),
      topScore: typeof item.topScore === "number" ? item.topScore : null,
      topTitle: typeof item.topTitle === "string" ? item.topTitle : null,
      passed: item.passed === true,
      notes: asStringArray(item.notes)
    };
  });
}

export type SearchIndexEmbeddings = {
  embeddings: number;
  embeddingTargetCounts: Record<string, number>;
};

/** `AdminHealth.searchIndex` declares its backend/searchable/restricted counters explicitly in
 * `lib/api.ts`, but falls back to its `[key: string]: unknown` index signature for `embeddings`
 * and `embeddingTargetCounts`, so those two read as `unknown` off the typed object. Narrow them
 * here instead of casting at every call site. */
export function getSearchIndexEmbeddings(searchIndex: AdminHealth["searchIndex"]): SearchIndexEmbeddings {
  return {
    embeddings: asNumber(searchIndex?.embeddings),
    embeddingTargetCounts: asNumberRecord(searchIndex?.embeddingTargetCounts)
  };
}

/** Live-data replacement for the old static "guardrails" marketing copy (audit-digest.md
 * ## admin-ingestion: "'Restricted-content guardrails' card is static marketing copy, not live
 * data"). Every sentence below is built from a real `AdminHealth` field. */
export function buildGuardrailChecks(health: AdminHealth): ReadinessCheck[] {
  const searchIndex = health.searchIndex ?? {};
  const searchEval = health.searchEval ?? { status: "pass", totalCases: 0, passedCases: 0, failedCases: 0, cases: [] };
  const reviewAudit = health.reviewAudit ?? {};
  const queue = health.queue ?? {};
  const evalCases = normalizeSearchEvalCases(searchEval.cases);
  const restrictionNote = evalCases.find((item) => item.name === "restricted_viewer_exclusion")?.notes[0];

  const evalTone: Tone = searchEval.status === "pass" ? "ok" : searchEval.status === "warn" ? "warn" : "danger";
  const queueTone: Tone = (health.ingestion?.failedJobs ?? 0) > 0 ? "danger" : queue.status === "degraded" ? "warn" : "ok";

  return [
    {
      label: "Restricted-content tracking",
      value: `${(searchIndex.restrictedContentUnitVersions ?? 0) + (searchIndex.restrictedWorkProductVersions ?? 0) + (searchIndex.restrictedContentBlocks ?? 0)} flagged`,
      hint: `${searchIndex.restrictedContentUnitVersions ?? 0} ContentUnit versions, ${searchIndex.restrictedWorkProductVersions ?? 0} WorkProduct versions, and ${searchIndex.restrictedContentBlocks ?? 0} ContentBlocks are flagged restricted on the ${searchIndex.backend ?? "search"} index and excluded from unauthorized results.`,
      tone: "ok"
    },
    {
      label: "Search relevance & restricted-exclusion eval",
      value: `${searchEval.passedCases ?? 0}/${searchEval.totalCases ?? 0} passing`,
      hint: restrictionNote ?? "Live search-quality eval cases run against the seeded catalog; see the Search & Eval tab for the full case list.",
      tone: evalTone
    },
    {
      label: "Governance audit trail",
      value: `${reviewAudit.auditEvents ?? 0} events`,
      hint: `${reviewAudit.auditEvents ?? 0} audit events recorded across ${reviewAudit.openReviewItems ?? 0} open review items. AI-suggested actions stay candidates until a reviewer applies them.`,
      tone: (reviewAudit.auditEvents ?? 0) > 0 ? "ok" : "warn"
    },
    {
      label: "Ingestion & queue health",
      value: queue.status ?? "unknown",
      hint: `Queue status "${queue.status ?? "unknown"}" via ${queue.adapter ?? "an unnamed adapter"}; ${health.ingestion?.failedJobs ?? 0} failed job(s) of ${health.ingestion?.totalJobs ?? 0} total.`,
      tone: queueTone
    }
  ];
}

export type AdminStageHealth = {
  currentStageCounts: Record<string, number>;
  completedStageCounts: Record<string, number>;
  failedStageCounts: Record<string, number>;
  stagesWithFailures: string[];
};

const EMPTY_STAGE_HEALTH: AdminStageHealth = {
  currentStageCounts: {},
  completedStageCounts: {},
  failedStageCounts: {},
  stagesWithFailures: []
};

/**
 * `AdminHealth.stages` (per-worker-stage current/completed/failed job counts, computed by
 * `admin_health()` in `services/api/app/application/use_cases.py`) is entirely missing from the
 * `AdminHealth` TS type in `lib/api.ts` (audit-digest.md ## admin-ingestion, gap "the `stages`
 * field is entirely missing from the AdminHealth TS type ... so it can never be rendered"). The
 * live payload does include it (`curl :8300/api/admin/health` returns a `stages` object); since
 * `lib/api.ts` is off-limits to edit, this reads it off the raw response defensively instead of
 * widening the shared type, and normalizes to the empty case if it is ever actually absent.
 */
export function getHealthStages(health: AdminHealth): AdminStageHealth {
  const raw = (health as unknown as { stages?: unknown }).stages;
  if (!raw || typeof raw !== "object") return EMPTY_STAGE_HEALTH;
  const stages = raw as Record<string, unknown>;
  return {
    currentStageCounts: asNumberRecord(stages.currentStageCounts),
    completedStageCounts: asNumberRecord(stages.completedStageCounts),
    failedStageCounts: asNumberRecord(stages.failedStageCounts),
    stagesWithFailures: asStringArray(stages.stagesWithFailures)
  };
}

export type StageRow = {
  key: string;
  label: string;
  hint: string;
  current: number;
  completed: number;
  failed: number;
  hasFailure: boolean;
};

/** Known worker-stage vocabulary from docs/project_plans/init/03_Architecture_Data_API_Guide.md
 * section 4.2, plus the lifecycle stage names the current in-memory/SQL pipeline actually writes
 * (services/api/app/application/use_cases.py::_mark_ingestion_stage / process_ingestion_job). Any
 * stage key the API returns that is not in this map still renders, using a humanized fallback
 * label, so nothing is silently dropped. */
const STAGE_LABELS: Record<string, { label: string; hint: string }> = {
  validate_file: { label: "Validate file", hint: "File type/size/status validation." },
  validated: { label: "Validate file", hint: "File type/size/status validation." },
  render_pages: { label: "Render pages", hint: "Preview images and thumbnails." },
  rendered: { label: "Render pages", hint: "Preview images and thumbnails." },
  extract_text: { label: "Extract text", hint: "Text, notes, and slide-title candidates." },
  extracted: { label: "Extract text", hint: "Text, notes, and slide-title candidates." },
  create_units: { label: "Create ContentUnits", hint: "ContentUnit versions and source links." },
  units_created: { label: "Create ContentUnits", hint: "ContentUnit versions and source links." },
  embed_units: { label: "Embed units", hint: "Vector rows for search." },
  indexed: { label: "Embed units", hint: "Vector rows for search." },
  enrich_units: { label: "Enrich units", hint: "Summary/taxonomy suggestions." },
  detect_candidates: { label: "Detect candidates", hint: "Review items and similarity edges." },
  uploaded: { label: "Uploaded", hint: "Source artifact stored; queued for processing." },
  uploaded_metadata: { label: "Uploaded (metadata only)", hint: "Metadata-only job with no stored file." },
  queued: { label: "Queued", hint: "Waiting to be picked up by a worker." },
  retry_queued: { label: "Retry queued", hint: "Re-queued after a retry request." },
  complete: { label: "Complete", hint: "Ingestion finished; outputs ready for review routing." }
};

export function describeStage(stage: string): { label: string; hint: string } {
  return STAGE_LABELS[stage] ?? { label: humanizeKey(stage), hint: "" };
}

/** Merges the three stage-keyed count maps `getHealthStages` returns (current job.stage
 * distribution vs. per-stage completion/failure telemetry) into one row set for a single table,
 * rather than fabricating alignment between vocabularies that do not fully overlap. */
export function buildStageRows(stages: AdminStageHealth): StageRow[] {
  const { currentStageCounts: current, completedStageCounts: completed, failedStageCounts: failed, stagesWithFailures } = stages;
  const failureSet = new Set(stagesWithFailures);
  const keys = new Set([...Object.keys(current), ...Object.keys(completed), ...Object.keys(failed)]);

  return [...keys]
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const { label, hint } = describeStage(key);
      return {
        key,
        label,
        hint,
        current: current[key] ?? 0,
        completed: completed[key] ?? 0,
        failed: failed[key] ?? 0,
        hasFailure: failureSet.has(key)
      };
    });
}

export type IngestionFailure = {
  jobId: string;
  title: string | null;
  stage: string;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  updatedAt: string;
};

/** `AdminHealth.ingestion.recentFailures` is typed `unknown[]` in `lib/api.ts`; normalize
 * defensively against the real `AdminIngestionFailure` schema (services/api/app/schemas/api.py)
 * instead of trusting the shape. */
export function normalizeRecentFailures(failures: unknown[] | undefined): IngestionFailure[] {
  if (!Array.isArray(failures)) return [];
  return failures
    .map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const jobId = typeof item.jobId === "string" ? item.jobId : null;
      if (!jobId) return null;
      return {
        jobId,
        title: typeof item.title === "string" ? item.title : null,
        stage: typeof item.stage === "string" ? item.stage : "unknown",
        errorCode: typeof item.errorCode === "string" ? item.errorCode : null,
        errorMessage: typeof item.errorMessage === "string" ? item.errorMessage : null,
        retryCount: asNumber(item.retryCount),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : ""
      };
    })
    .filter((item): item is IngestionFailure => item !== null);
}

export function humanizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

const AUDIT_ACTION_TONE: Record<string, Tone> = {
  approve: "ok",
  ingestion_complete: "ok",
  canonical_change: "primary",
  merge_versions: "primary",
  duplicate_version_merge: "primary",
  variant_link_change: "primary",
  mark_variant: "ai",
  mark_similar: "ai",
  review_candidate_generated: "ai",
  deprecate: "warn",
  ingestion_retry: "warn",
  reject: "danger",
  upload_rejected: "danger"
};

export function auditActionTone(action: string): Tone {
  return AUDIT_ACTION_TONE[action] ?? "neutral";
}

export function auditActionLabel(action: string): string {
  return humanizeKey(action);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

/** Best-effort target-detail link for an audit event row. Only object types with a real detail
 * route in this app get a link; everything else renders as plain (still fully informative) text
 * instead of a dead or fabricated href. */
export function auditTargetHref(event: AuditEvent): string | null {
  if (event.targetType === "content_unit_version" || event.targetType === "content_unit_family") {
    return `/content-units/${event.targetId}`;
  }
  if (event.targetType === "work_product_version" || event.targetType === "work_product_family") {
    return `/work-products/${event.targetId}`;
  }
  return null;
}
