import { GitCommitVertical, MessageSquare, NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { ActivityEvent } from "@/features/content-units/lib";
import { formatDateTime } from "@/features/content-units/lib";

const ICONS = {
  version: GitCommitVertical,
  comment: MessageSquare,
  note: NotebookPen
} as const;

const TONE_FG: Record<string, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  ai: "var(--ai)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  neutral: "var(--ink-3)"
};

/** Renders the activity events already derived from data loaded elsewhere on this page (version
 * creation, comments, notes). This is intentionally NOT the governed audit-event log: that endpoint
 * (GET /api/admin/audit-events) is admin-role-gated and unfiltered/global, so it is not called from
 * this screen. */
export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity to show yet"
        body="This timeline is built from version, comment, and note history already loaded on this page. The full governed audit-event log requires admin access and is not queried here."
      />
    );
  }
  return (
    <div>
      <div className="grid gap-0">
        {events.map((event, index) => {
          const Icon = ICONS[event.kind];
          return (
            <div key={event.id} className={`flex items-start gap-3 py-2.5 ${index < events.length - 1 ? "border-b border-dashed border-[var(--line-soft)]" : ""}`}>
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{ background: `color-mix(in oklab, ${TONE_FG[event.tone]} 14%, white)`, color: TONE_FG[event.tone] }}
                aria-hidden="true"
              >
                <Icon size={12} />
              </span>
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-semibold text-[var(--ink)]">{event.title}</div>
                {event.description && <div className="mt-0.5 text-[var(--ink-2)]">{event.description}</div>}
                <div className="muted mt-0.5 text-[11px]">{formatDateTime(event.date)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted mt-3 text-[11px]">
        This timeline reflects version, comment, and note history loaded on this page. It is not the governed audit-event log (admin-only).
      </div>
    </div>
  );
}
