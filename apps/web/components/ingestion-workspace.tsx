"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, FileUp, Loader2, RefreshCw, RotateCcw, SearchCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import {
  boxbrainApi,
  type ArtifactType,
  type IngestionJob,
  type IngestionJobStatus
} from "@/lib/api";
import { Button, Card, EmptyState, StatusBadge, Tag } from "@/components/ui";

const artifactTypes: Array<{ label: string; value: ArtifactType }> = [
  { label: "Deck", value: "deck" },
  { label: "Brief", value: "brief" },
  { label: "Document", value: "document" },
  { label: "One pager", value: "one_pager" },
  { label: "Whitepaper", value: "whitepaper" },
  { label: "Proposal", value: "proposal" },
  { label: "Other", value: "other" }
];

const statusCopy: Record<IngestionJobStatus, { tone: "ok" | "warn" | "danger" | "neutral"; icon: ComponentType<{ size?: number; className?: string }> }> = {
  queued: { tone: "neutral", icon: Clock3 },
  running: { tone: "warn", icon: Loader2 },
  failed: { tone: "danger", icon: XCircle },
  complete: { tone: "ok", icon: CheckCircle2 }
};

export function IngestionWorkspace() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function refreshJobs(nextSelectedId?: string) {
    setIsLoadingJobs(true);
    setError(null);
    try {
      const response = await boxbrainApi.listIngestionJobs();
      setJobs(response.items);
      const nextId = nextSelectedId ?? selectedJobId ?? response.items[0]?.id ?? null;
      setSelectedJobId(nextId);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not load ingestion jobs.");
      setJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }

  useEffect(() => {
    void refreshJobs();
    // The first load should run once; later refreshes are explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      return;
    }

    let isActive = true;
    setSelectedJob(null);
    setIsLoadingDetail(true);
    boxbrainApi
      .getIngestionJob(selectedJobId)
      .then((job) => {
        if (!isActive) return;
        setSelectedJob(job);
        setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      })
      .catch((detailError) => {
        if (!isActive) return;
        setError(detailError instanceof Error ? detailError.message : "Could not load ingestion job detail.");
      })
      .finally(() => {
        if (isActive) setIsLoadingDetail(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedJobId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setUploadMessage("Choose a source file before uploading.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setUploadMessage("Upload a .pptx deck. Other source formats are not accepted in this milestone.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadMessage(null);
    try {
      const job = await boxbrainApi.uploadArtifact({
        file,
        artifactType: (formData.get("artifactType") as ArtifactType | null) ?? "deck",
        title: formData.get("title")?.toString()
      });
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setSelectedJobId(job.id);
      setSelectedJob(job);
      setUploadMessage("Upload accepted. Ingestion job queued.");
      form.reset();
    } catch (uploadError) {
      setUploadMessage(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRetry(jobId: string) {
    setRetryingJobId(jobId);
    setError(null);
    setUploadMessage(null);
    try {
      const job = await boxbrainApi.retryIngestionJob(jobId);
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setSelectedJobId(job.id);
      setSelectedJob(job);
      setUploadMessage("Retry queued for failed ingestion job.");
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Could not retry ingestion job.");
    } finally {
      setRetryingJobId(null);
    }
  }

  const selected = selectedJob ?? jobs.find((job) => job.id === selectedJobId) ?? null;
  const summary = useMemo(() => summarizeJobs(jobs), [jobs]);

  return (
    <div className="grid gap-5" data-testid="ingestion-workspace">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="m-0 text-base font-bold">Upload source artifact</h2>
            <p className="m-0 text-sm text-slate-500">Creates an ingestion job through the governed upload pipeline.</p>
          </div>
          <Button type="button" onClick={() => void refreshJobs()} disabled={isLoadingJobs}>
            <RefreshCw size={14} className={isLoadingJobs ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
        <form className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_180px_minmax(180px,0.8fr)_auto]" onSubmit={handleUpload}>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
            Source file
            <input
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
              name="file"
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
            Artifact type
            <select className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800" name="artifactType" defaultValue="deck">
              {artifactTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
            Title
            <input
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800"
              name="title"
              placeholder="Optional display title"
            />
          </label>
          <Button className="self-end" type="submit" variant="primary" disabled={isUploading}>
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {isUploading ? "Uploading" : "Upload"}
          </Button>
        </form>
        {uploadMessage && (
          <div className="border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            {uploadMessage}
          </div>
        )}
      </Card>

      <div className="grid-auto" data-testid="ingestion-status-metrics">
        <MetricCard label="Queued" value={summary.queued} tone="neutral" />
        <MetricCard label="Running" value={summary.running} tone="warn" />
        <MetricCard label="Complete" value={summary.complete} tone="ok" />
        <MetricCard label="Failed" value={summary.failed} tone="danger" />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">Ingestion API error</div>
              <div>{error}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="two-col">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="m-0 text-base font-bold">Ingestion jobs</h2>
            <p className="m-0 text-sm text-slate-500">Live job list from `/api/ingestion-jobs`.</p>
          </div>
          <div className="grid gap-2 p-3" data-testid="ingestion-job-list">
            {isLoadingJobs ? (
              <LoadingRows />
            ) : jobs.length === 0 ? (
              <EmptyState title="No ingestion jobs yet" body="Upload a source artifact to create the first job, or refresh once the API has seeded data." />
            ) : (
              jobs.map((job) => <JobRow key={job.id} job={job} selected={job.id === selectedJobId} onSelect={() => setSelectedJobId(job.id)} />)
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="m-0 text-base font-bold">Job detail</h2>
            <p className="m-0 text-sm text-slate-500">Status, provenance links, and failure reason.</p>
          </div>
          <div className="p-4">
            {isLoadingDetail ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading job detail
              </div>
            ) : selected ? (
              <JobDetail job={selected} isRetrying={retryingJobId === selected.id} onRetry={() => void handleRetry(selected.id)} />
            ) : (
              <EmptyState title="No job selected" body="Select a job from the list to inspect the latest stage and outputs." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function JobRow({ job, selected, onSelect }: { job: IngestionJob; selected: boolean; onSelect: () => void }) {
  const status = statusCopy[job.status] ?? statusCopy.queued;
  const Icon = status.icon;
  return (
    <button
      className={`grid cursor-pointer gap-2 rounded-lg border p-3 text-left transition hover:bg-slate-50 ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{job.id}</div>
          <div className="mt-1 text-xs text-slate-500">{job.stage}</div>
        </div>
        <StatusBadge tone={status.tone}>
          <Icon size={12} className={job.status === "running" ? "animate-spin" : ""} />
          {job.status}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <Tag>created {formatDate(job.createdAt)}</Tag>
        <Tag>updated {formatDate(job.updatedAt)}</Tag>
      </div>
    </button>
  );
}

function JobDetail({ job, isRetrying, onRetry }: { job: IngestionJob; isRetrying: boolean; onRetry: () => void }) {
  const status = statusCopy[job.status] ?? statusCopy.queued;
  const metadata = normalizeUploadMetadata(job);
  const workProductVersionId = job.workProductVersionId ?? metadata.workProductVersionId ?? null;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={status.tone}>{job.status}</StatusBadge>
        <Tag>{job.stage}</Tag>
      </div>
      <dl className="grid gap-3 text-sm">
        <DetailRow label="Job ID" value={job.id} />
        <DetailRow label="Original object" value={job.originalObjectId ?? "Pending"} />
        <DetailRow
          label="Work product version"
          value={workProductVersionId ? <InlineLink href={`/work-products/${workProductVersionId}`}>{workProductVersionId}</InlineLink> : "Pending"}
        />
        <DetailRow label="Slide count" value={metadata.slideCount === null ? "Pending" : String(metadata.slideCount)} />
        <DetailRow label="Retry count" value={String(job.retryCount)} />
        <DetailRow label="Created" value={formatDate(job.createdAt)} />
        <DetailRow label="Updated" value={formatDate(job.updatedAt)} />
        <DetailRow label="Completed" value={job.completedAt ? formatDate(job.completedAt) : "Not complete"} />
      </dl>
      {job.status === "failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-bold">{job.errorCode ?? "Ingestion failed"}</div>
              <div className="mt-1">{job.errorMessage ?? "No failure message was returned by the API."}</div>
            </div>
            <Button type="button" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Retry
            </Button>
          </div>
        </div>
      )}
      {metadata.outputSummary && (
        <Panel title="Output summary">
          <pre className="m-0 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">{metadata.outputSummary}</pre>
        </Panel>
      )}
      {metadata.warnings.length > 0 && (
        <Panel title="Warnings" tone="warn">
          <ul className="m-0 grid gap-2 p-0">
            {metadata.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="list-none rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {warning}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {metadata.createdContentUnitVersionIds.length > 0 && (
        <Panel title="Created ContentUnits">
          <div className="grid gap-2">
            {metadata.createdContentUnitVersionIds.map((id, index) => (
              <Link key={id} href={`/content-units/${id}`} className="rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                {index + 1}. {id}
              </Link>
            ))}
          </div>
        </Panel>
      )}
      {(metadata.stageTelemetry.length > 0 || metadata.stageTimestamps.length > 0) && (
        <Panel title="Stage telemetry">
          <div className="grid gap-2">
            {[...metadata.stageTelemetry, ...metadata.stageTimestamps].map(([key, value]) => (
              <div key={key} className="grid gap-1 rounded-lg border border-slate-200 p-3 text-sm sm:grid-cols-[160px_1fr]">
                <div className="font-bold text-slate-600">{humanizeKey(key)}</div>
                <div className="break-words text-slate-700">{value}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {job.status === "complete" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-bold">
            <SearchCheck size={15} />
            Ready for review routing
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">{label}</dt>
      <dd className="m-0 break-words font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function Panel({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "warn" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warn" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-blue-700 underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" | "neutral" }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-bold text-slate-950">{value}</div>
        <StatusBadge tone={tone}>{label.toLowerCase()}</StatusBadge>
      </div>
    </Card>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-slate-200 p-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function summarizeJobs(jobs: IngestionJob[]) {
  return jobs.reduce(
    (summary, job) => {
      summary[job.status] += 1;
      return summary;
    },
    { queued: 0, running: 0, failed: 0, complete: 0 } satisfies Record<IngestionJobStatus, number>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function normalizeUploadMetadata(job: IngestionJob) {
  const metadata = job.uploadMetadata;
  const outputSummary = job.outputSummary ?? null;
  const createdIds = stringArray(
    outputSummary?.createdContentUnitVersionIds ?? metadata.createdContentUnitVersionIds ?? metadata.contentUnitVersionIds
  );
  return {
    createdContentUnitVersionIds: createdIds,
    slideCount:
      typeof outputSummary?.slideCount === "number"
        ? outputSummary.slideCount
        : typeof metadata.slideCount === "number"
          ? metadata.slideCount
          : null,
    warnings: stringArray(outputSummary?.warnings ?? metadata.warnings),
    stageTelemetry: objectEntries(job.stageTelemetry ?? metadata.stageTelemetry),
    stageTimestamps: objectEntries(metadata.stageTimestamps),
    outputSummary: formatMetadataValue(outputSummary ?? metadata.outputSummary),
    workProductVersionId:
      typeof outputSummary?.workProductVersionId === "string"
        ? outputSummary.workProductVersionId
        : typeof metadata.workProductVersionId === "string"
          ? metadata.workProductVersionId
          : null
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function objectEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, item]) => [key, formatMetadataValue(item) ?? ""] as const);
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function humanizeKey(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
}
