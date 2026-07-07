"use client";

import { AlertCircle, ScrollText, ShieldAlert } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, SectionHead, StatusBadge, Tag } from "@/components/ui";
import type { AuditEvent } from "@/features/admin/audit-events-api";
import { auditActionLabel, auditActionTone, auditTargetHref, formatDateTime } from "@/features/admin/lib";

const PAGE_SIZE = 10;

export type AuditLogResult = { status: "ok"; events: AuditEvent[] } | { status: "restricted" } | { status: "error"; message: string };

/**
 * Governance audit-event browser (audit-digest.md ## admin-ingestion, gap "No audit log browser —
 * only a raw count is shown"). `GET /api/admin/audit-events` has no cursor/limit query params
 * server-side today, so the full set is fetched once server-side (see
 * `features/admin/audit-events-api.ts`) and this client component windows it locally with a
 * "Show more" affordance instead of claiming server-side pagination that does not exist.
 */
export function AuditLogCard({ result }: { result: AuditLogResult }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (result.status === "restricted") {
    return (
      <Card className="p-5" data-testid="admin-audit-log">
        <div className="flex items-start gap-3 text-slate-700">
          <ShieldAlert size={18} className="mt-0.5 text-amber-600" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold">Admin access required</div>
            <p className="m-0 mt-1 text-sm text-slate-500">Audit events are only visible to admin-role actors.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (result.status === "error") {
    return (
      <Card className="p-5" data-testid="admin-audit-log">
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle size={18} className="mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold">Audit events could not be loaded</div>
            <p className="m-0 mt-1 text-sm text-red-700">{result.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  const events = [...result.events].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const visible = events.slice(0, visibleCount);

  return (
    <Card className="overflow-hidden" data-testid="admin-audit-log">
      <div className="border-b border-slate-200 p-4">
        <SectionHead count={events.length}>
          <ScrollText size={16} className="mr-1.5 inline align-[-3px]" aria-hidden="true" /> Audit log
        </SectionHead>
        <p className="m-0 mt-1 text-sm text-slate-500">Governance mutations from `GET /api/admin/audit-events`: approvals, canonical changes, variant/similarity links, and ingestion lifecycle events.</p>
      </div>
      {events.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No audit events recorded yet"
            body="Every governance action (approve, mark variant/similar, set canonical, merge versions, ingestion complete/retry) writes an audit event with actor, prior/new state, and reason. None exist in this environment yet."
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Reason</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => {
                  const href = auditTargetHref(event);
                  return (
                    <tr key={event.id}>
                      <td>
                        <StatusBadge tone={auditActionTone(event.action)}>{auditActionLabel(event.action)}</StatusBadge>
                      </td>
                      <td className="font-semibold text-slate-800">{event.actorId}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <Tag size="sm">{event.targetType}</Tag>
                          {href ? (
                            <Link href={href} className="truncate text-xs font-mono text-blue-700 underline-offset-2 hover:underline">
                              {event.targetId}
                            </Link>
                          ) : (
                            <span className="truncate text-xs font-mono text-slate-500">{event.targetId}</span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate text-slate-600" title={event.reason ?? undefined}>
                        {event.reason ?? "—"}
                      </td>
                      <td className="whitespace-nowrap text-slate-500">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleCount < events.length && (
            <div className="flex justify-center border-t border-slate-100 p-3">
              <Button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more ({events.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
