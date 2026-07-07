import { Cable, Settings, Tags, Users } from "lucide-react";
import { Button, Card, SectionHead, Tag } from "@/components/ui";

type SurfaceDefinition = {
  key: string;
  icon: typeof Users;
  title: string;
  body: string;
  currentState: string;
};

/**
 * Admin persona jobs from the PRD (section 4.1: "configure connectors, roles, and permissions",
 * "manage taxonomy and retention policy") with no backing API today (audit-digest.md
 * ## admin-ingestion, gap "No admin surface (even placeholder) for roles, taxonomy, connectors, or
 * retention", all three marked `API[no]`). Rendered as honest, clearly-disabled previews rather
 * than fabricated tables of users/terms/connectors that do not exist. Mirrors the disabled-button
 * pattern `components/reviews-hub.tsx` already uses for its own no-endpoint "Queue Settings" action.
 */
const SURFACES: SurfaceDefinition[] = [
  {
    key: "roles",
    icon: Users,
    title: "Roles & permissions",
    body: "Role comes only from request headers (x-boxbrain-role / x-boxbrain-user) resolved per-request; there is no persisted user or role table/endpoint to list, invite, or reassign actors.",
    currentState: "services/api/app/api/dependencies.py::get_actor"
  },
  {
    key: "taxonomy",
    icon: Tags,
    title: "Taxonomy catalog",
    body: "Taxonomy is accepted only as free-form per-upload JSON on the ingestion form; there is no admin route to list, create, or edit the offering/technology/sector/audience terms used for classification.",
    currentState: "POST /api/uploads (taxonomy field)"
  },
  {
    key: "connectors",
    icon: Cable,
    title: "Connectors & retention",
    body: "No connector-configuration or retention-policy routes or domain models exist yet; source connectors and retention windows cannot be configured from this dashboard.",
    currentState: "No route in services/api/app/api"
  }
];

export function AdminSurfacesGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-3" data-testid="admin-surfaces">
      {SURFACES.map((surface) => {
        const Icon = surface.icon;
        return (
          <Card key={surface.key} className="flex flex-col p-4">
            <SectionHead
              action={
                <Tag tone="warn" size="sm">
                  not available
                </Tag>
              }
            >
              <Icon size={16} className="mr-1.5 inline align-[-3px]" aria-hidden="true" /> {surface.title}
            </SectionHead>
            <p className="m-0 mt-2 flex-1 text-sm text-slate-600">{surface.body}</p>
            <p className="m-0 mt-2 font-mono text-xs text-slate-400">{surface.currentState}</p>
            <Button className="mt-3 justify-center" disabled title="No backing API exists yet (audit-digest.md ## admin-ingestion).">
              <Settings size={14} /> Configure
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
