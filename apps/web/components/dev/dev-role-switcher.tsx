"use client";

import { useEffect, useState, type ChangeEvent } from "react";

import {
  DEFAULT_DEV_ROLE,
  DEV_ACTOR_CHANGED_EVENT,
  DEV_ROLES,
  getDevActor,
  isDevActorSwitcherEnabled,
  setDevActor,
  type DevRole,
} from "@/lib/dev-actor";

/**
 * Dev-only floating control that switches the actor role sent on every API call.
 * Renders nothing on the server or in a production build (unless explicitly
 * opted in via NEXT_PUBLIC_BOXBRAIN_DEV_ROLE_SWITCHER=true). It exists so testers
 * can exercise restricted-visibility paths that the shipped "admin" default never
 * reaches — it is not a product feature and not a real authorization mechanism.
 */
export function DevRoleSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<DevRole>(DEFAULT_DEV_ROLE);

  useEffect(() => {
    setMounted(true);
    const actor = getDevActor();
    if (actor) setRole(actor.role);
    const onChange = () => {
      const next = getDevActor();
      if (next) setRole(next.role);
    };
    window.addEventListener(DEV_ACTOR_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DEV_ACTOR_CHANGED_EVENT, onChange);
  }, []);

  // Guard after hooks so hook order stays stable across renders.
  if (!mounted || !isDevActorSwitcherEnabled()) return null;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as DevRole;
    setRole(next);
    setDevActor(next);
    // Full reload so every server + client fetch re-runs under the new actor and
    // restricted-visibility paths are exercised end-to-end.
    window.location.reload();
  };

  return (
    <div
      role="region"
      aria-label="Developer role switcher"
      style={{
        position: "fixed",
        bottom: "12px",
        right: "12px",
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        borderRadius: "8px",
        border: "1px solid #b45309",
        background: "#1f2937",
        color: "#fef3c7",
        font: "12px/1.2 var(--mono, monospace)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
      }}
    >
      <label htmlFor="dev-role-switcher" style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Dev actor
      </label>
      <select
        id="dev-role-switcher"
        value={role}
        onChange={handleChange}
        style={{
          background: "#111827",
          color: "#fef3c7",
          border: "1px solid #b45309",
          borderRadius: "6px",
          padding: "3px 6px",
          font: "inherit",
        }}
      >
        {DEV_ROLES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
