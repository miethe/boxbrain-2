import { Card, PageHeader } from "@/components/ui";

export default function ContentUnitLoading() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="ContentUnit detail" title="Loading ContentUnit" description="Loading governed family, version, provenance, comments, notes, and usage references." />
      <div className="two-col">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
              <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
              <div className="grid content-start gap-4">
                <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card className="h-72 animate-pulse bg-slate-100">
            <span className="sr-only">Loading variants and versions</span>
          </Card>
        </div>
        <div className="grid content-start gap-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="h-32 animate-pulse bg-slate-100">
              <span className="sr-only">Loading ContentUnit side panel</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
