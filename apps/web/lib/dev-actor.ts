// Dev-only actor switcher store.
//
// BoxBrain has no identity provider yet — the API resolves an Actor purely from
// `x-boxbrain-role` / `x-boxbrain-user` headers (services/api/app/api/dependencies.py).
// Shipped as-is, `lib/api.ts` always sends `admin`, so restricted-visibility code paths
// are never exercised by anyone using the app. This store lets a tester pick a role
// (viewer/contributor/curator/reviewer/admin) so those paths get walked before pilot
// content loads. It is header-based DEV auth only and MUST NOT be treated as a real
// authorization mechanism — it is gated off in production builds unless explicitly
// opted in for pilot rehearsal.
//
// Scope: the selection is stored in the browser (localStorage), so it only reaches
// CLIENT-side fetches (Library browse, Ask, search, and any client refetch — the primary
// restricted-visibility surfaces). Server-rendered (RSC) pages fetch before the browser
// runs and therefore still use the default "admin" actor; switching to a real per-request
// identity for those is capability 1 Phase 2/4 in the backend handoff plan.

export const DEV_ROLES = ["viewer", "contributor", "curator", "reviewer", "admin"] as const;
export type DevRole = (typeof DEV_ROLES)[number];

/** Preserves the app's historical default actor when nothing is selected. */
export const DEFAULT_DEV_ROLE: DevRole = "admin";

const STORAGE_KEY = "boxbrain.devActor";
export const DEV_ACTOR_CHANGED_EVENT = "boxbrain:dev-actor-changed";

export type DevActor = { role: DevRole; userId: string };

function isDevRole(value: string | null): value is DevRole {
  return value !== null && (DEV_ROLES as readonly string[]).includes(value);
}

/**
 * Whether the switcher UI and its header override are active. Always on in
 * development; in a production build only when explicitly opted in via
 * `NEXT_PUBLIC_BOXBRAIN_DEV_ROLE_SWITCHER=true` (pilot rehearsal against the
 * containerized stack).
 */
export function isDevActorSwitcherEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_BOXBRAIN_DEV_ROLE_SWITCHER === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/** The currently-selected dev actor, or null when unset / disabled / server-side. */
export function getDevActor(): DevActor | null {
  if (typeof window === "undefined") return null;
  if (!isDevActorSwitcherEnabled()) return null;
  try {
    const role = window.localStorage.getItem(STORAGE_KEY);
    if (!isDevRole(role)) return null;
    return { role, userId: `dev-${role}` };
  } catch {
    return null;
  }
}

export function setDevActor(role: DevRole): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
    window.dispatchEvent(new CustomEvent(DEV_ACTOR_CHANGED_EVENT, { detail: { role } }));
  } catch {
    // Storage unavailable (private mode / disabled) — nothing to persist.
  }
}

/**
 * Headers to attach to API requests for the selected dev actor. Empty when no
 * actor is selected, so callers keep their existing default-actor behavior.
 */
export function devActorHeaders(): Record<string, string> {
  const actor = getDevActor();
  if (!actor) return {};
  return {
    "x-boxbrain-role": actor.role,
    "x-boxbrain-user-id": actor.userId,
    "x-boxbrain-user": actor.role,
  };
}
