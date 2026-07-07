import { AlertTriangle, ListTree, RotateCcw, Server } from "lucide-react";
import Link from "next/link";
import { Card, SectionHead, StatusBadge, Tag } from "@/components/ui";
import type { AdminHealth } from "@/lib/api";
import { buildStageRows, formatDateTime, normalizeRecentFailures, type AdminStageHealth } from "@/features/admin/lib";

/**
 * Surfaces `AdminHealth.stages` (per-worker-stage current/completed/failed counts), which the
 * Admin dashboard previously never read at all (audit-digest.md ## admin-ingestion, gap "Pipeline
 * stage, queue, and search-index/eval telemetry computed by the backend is never surfaced"). The
 * `stages` field is missing from the `AdminHealth` TS type in `lib/api.ts`, so the caller resolves
 * it via `features/admin/lib.ts::getHealthStages()` and passes the normalized shape in here.
 */
export function StageHealthCard({ stages }: { stages: AdminStageHealth }) {
  const rows = buildStageRows(stages);

  return (
    <Card className="overflow-hidden" data-testid="admin-stage-health">
      <div className="border-b border-slate-200 p-4">
        <SectionHead>
          <ListTree size={16} className="mr-1.5 inline align-[-3px]" aria-hidden="true" /> Pipeline stage health
        </SectionHead>
        <p className="m-0 mt-1 text-sm text-slate-500">Live per-stage job counts from `GET /api/admin/health` (`stages`).</p>
      </div>
      {rows.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">No ingestion jobs have recorded stage telemetry yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Stage</th>
                <th className="num">Currently at</th>
                <th className="num">Completed</th>
                <th className="num">Failed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} title={row.hint || undefined}>
                  <td className="font-semibold text-slate-800">{row.label}</td>
                  <td className="num">{row.current}</td>
                  <td className="num">{row.completed}</td>
                  <td className="num">{row.failed}</td>
                  <td>{row.hasFailure ? <StatusBadge tone="danger">failures</StatusBadge> : <StatusBadge tone="ok">clean</StatusBadge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Surfaces the full `AdminHealth.queue` object (adapter/queueName/per-status counts/notes), of
 * which only `queue.status` was previously rendered as a single Tag. */
export function QueueHealthCard({ queue }: { queue: AdminHealth["queue"] }) {
  const status = queue?.status ?? "unknown";
  const tone = status === "healthy" || status === "idle" ? "ok" : status === "degraded" ? "danger" : "warn";

  const counts: Array<{ label: string; value: number | undefined }> = [
    { label: "Enqueued", value: queue?.enqueuedJobCount },
    { label: "Queued", value: queue?.queuedJobCount },
    { label: "Running", value: queue?.runningJobCount },
    { label: "Failed", value: queue?.failedJobCount },
    { label: "Retry queued", value: queue?.retryQueuedJobCount }
  ];

  return (
    <Card className="p-4" data-testid="admin-queue-health">
      <SectionHead
        action={
          <StatusBadge tone={tone}>
            <Server size={12} aria-hidden="true" /> {status}
          </StatusBadge>
        }
      >
        Queue health
      </SectionHead>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
        <Tag>adapter: {queue?.adapter ?? "unknown"}</Tag>
        <Tag>queue: {queue?.queueName ?? "unnamed"}</Tag>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {counts.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 p-2 text-center">
            <div className="text-lg font-black text-slate-950">{item.value ?? 0}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>
      {(queue?.notes ?? []).length > 0 && (
        <ul className="m-0 mt-3 grid gap-1.5 p-0 text-xs text-slate-500">
          {(queue?.notes ?? []).map((note, index) => (
            <li key={`${note}-${index}`} className="list-none">
              · {note}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Surfaces `AdminHealth.ingestion.recentFailures`, previously fetched but never rendered. There is
 * no per-job detail route on the Admin side (job detail lives inside the `IngestionWorkspace`
 * client component's local selection state), so each row links to `/ingestion` rather than a
 * fabricated deep link. */
export function RecentFailuresCard({ failures }: { failures: unknown[] | undefined }) {
  const rows = normalizeRecentFailures(failures);

  return (
    <Card className="p-4" data-testid="admin-recent-failures">
      <SectionHead count={rows.length}>
        <AlertTriangle size={16} className="mr-1.5 inline align-[-3px] text-amber-600" aria-hidden="true" /> Recent ingestion failures
      </SectionHead>
      {rows.length === 0 ? (
        <p className="m-0 mt-2 text-sm text-slate-500">No failed ingestion jobs are currently recorded.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((failure) => (
            <div key={failure.jobId} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-red-900">{failure.title ?? failure.jobId}</div>
                <Tag tone="danger">
                  <RotateCcw size={11} /> {failure.retryCount} {failure.retryCount === 1 ? "retry" : "retries"}
                </Tag>
              </div>
              <div className="mt-1 text-red-800">{failure.errorMessage ?? failure.errorCode ?? "No failure message returned by the API."}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-700">
                <span>stage: {failure.stage}</span>
                <span>updated {formatDateTime(failure.updatedAt)}</span>
                <Link href="/ingestion" className="font-semibold underline-offset-2 hover:underline">
                  Open in Ingestion workspace →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
