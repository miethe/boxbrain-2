import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHead } from "@/components/ui";
import { listAllStoryboards, type Storyboard } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function StoryboardsIndexPage() {
  let storyboards: Storyboard[] = [];
  let loadError: string | null = null;
  try {
    storyboards = await listAllStoryboards();
  } catch {
    loadError = "Storyboards could not be loaded. Check that the API is reachable and try again.";
  }

  return (
    <div className="route-body" data-testid="storyboards-index-page">
      <PageHeader
        eyebrow="Compose"
        title="Storyboards"
        description="Structured narratives composed from sections and slots. Open a draft to keep composing, or review immutable snapshots."
      />
      {loadError ? (
        <EmptyState title="Storyboards unavailable" body={loadError} />
      ) : storyboards.length === 0 ? (
        <EmptyState
          title="No storyboards yet"
          body="Create a storyboard from the Library or a ContentUnit detail page by adding content to a deck."
        />
      ) : (
        <Card className="p-4">
          <SectionHead count={storyboards.length}>All storyboards</SectionHead>
          <div className="mt-2 flex flex-col">
            {storyboards.map((storyboard) => (
              <Link
                key={storyboard.id}
                href={`/storyboards/${storyboard.id}`}
                className="list-row"
                data-testid="storyboards-index-row"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <LayoutGrid size={15} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{storyboard.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    Updated {new Date(storyboard.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </span>
                <Badge kind={String(storyboard.mode) === "draft" ? "warn" : "ok"}>{String(storyboard.mode)}</Badge>
              </Link>
            ))}
          </div>
          <p className="muted mt-3 flex items-center gap-1 text-xs">
            <Plus size={12} aria-hidden="true" /> New storyboards are created from composition surfaces (Library selection,
            ContentUnit detail, Ask) — a standalone create flow ships with the publish workflow.
          </p>
        </Card>
      )}
    </div>
  );
}
