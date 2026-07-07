// Direct fetch helper for the governance audit-event browser on the Admin dashboard.
//
// `GET /api/admin/audit-events` exists server-side (services/api/app/api/routes/admin.py) but has
// no typed client function in `lib/api.ts` yet (docs/project_plans/uplift/audit-digest.md
// ## admin-ingestion, gap "No audit log browser"). Per the Admin/Ingestion wave brief, new API
// surface area is added as a screen-owned direct fetch helper here rather than editing the shared
// `lib/api.ts` file. This mirrors `lib/api.ts`'s own request shape (base URL resolution, actor
// header, no-store caching, JSON error parsing) so behavior stays consistent with `getAdminHealth()`.
import { ApiError } from "@/lib/api";

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const SERVER_API_BASE_URL = process.env.BOXBRAIN_SERVER_API_BASE_URL ?? PUBLIC_API_BASE_URL;

export type AuditEvent = {
  id: string;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string;
  priorState: Record<string, unknown>;
  newState: Record<string, unknown>;
  reason?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function auditEventsUrl() {
  const baseUrl = typeof window === "undefined" ? SERVER_API_BASE_URL : PUBLIC_API_BASE_URL;
  return `${baseUrl}/api/admin/audit-events`;
}

/**
 * `services/api/app/api/dependencies.py::get_actor` resolves the request role from
 * `x-boxbrain-role`, falling back to `x-boxbrain-user` when no role header is sent at all. Sending
 * `x-boxbrain-user: admin` without a role header reproduces the same "admin" actor `lib/api.ts`'s
 * `defaultHeaders()` already establishes for `getAdminHealth()`, so this stays consistent with how
 * the rest of the Admin page authenticates.
 */
function auditEventHeaders(): HeadersInit {
  return { "x-boxbrain-user": "admin" };
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      message?: string;
      error?: string | { message?: string };
    };
    const nestedErrorMessage = typeof payload.error === "object" ? payload.error?.message : payload.error;
    return payload.detail ?? nestedErrorMessage ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetches the full audit-event list. The route has no cursor/limit query params today (unlike the
 * content-unit/review/work-product list endpoints the same backend quick-fix wave paginated), so
 * this always returns the complete set; callers that want a windowed view should paginate
 * client-side. If the backend later wraps the response in a `{ items }` envelope (matching the
 * shared list-pagination shape used elsewhere in `lib/api.ts`), this helper keeps working unchanged.
 */
export async function getRecentAuditEvents(): Promise<AuditEvent[]> {
  const response = await fetch(auditEventsUrl(), {
    headers: auditEventHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, `Audit events request failed with status ${response.status}`);
    throw new ApiError(response.status, message);
  }

  const payload = (await response.json()) as AuditEvent[] | { items?: AuditEvent[] };
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}
