import { Card, PageHeader } from "@/components/ui";

/** Route-level loading skeleton, matching the pattern already used by `/admin`'s `loading.tsx`
 * (audit-digest.md ## admin-ingestion, gap "Ingestion page has no restricted-state handling and no
 * route-level loading skeleton (asymmetric with Admin)"). */
export default function IngestionLoading() {
  return (
    <div className="route-body" data-testid="ingestion-loading">
      <PageHeader eyebrow="Ingestion" title="Upload and job monitor" description="Loading upload form, job queue, and job detail." />
      <div className="grid gap-5">
        <Card className="h-40 animate-pulse bg-slate-100">
          <span className="sr-only">Loading upload form</span>
        </Card>
        <div className="grid-auto">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="h-20 animate-pulse bg-slate-100">
              <span className="sr-only">Loading ingestion status metric</span>
            </Card>
          ))}
        </div>
        <div className="two-col">
          <Card className="h-72 animate-pulse bg-slate-100">
            <span className="sr-only">Loading ingestion jobs</span>
          </Card>
          <Card className="h-72 animate-pulse bg-slate-100">
            <span className="sr-only">Loading job detail</span>
          </Card>
        </div>
      </div>
    </div>
  );
}
