import { Card } from "@/components/ui";

export default function ContentUnitLoading() {
  return (
    <div className="route-body">
      <div className="h-3 w-56 animate-pulse rounded bg-slate-200" />
      <div className="page-head-row mt-3">
        <div className="grid gap-2" style={{ flex: 1 }}>
          <div className="h-7 w-72 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-96 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-8 w-24 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="tabs mt-4">
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="h-8 w-20 animate-pulse rounded bg-slate-100" />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden p-4">
          <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
        </Card>
        <Card className="p-4">
          <span className="sr-only">Loading ContentUnit overview</span>
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-4 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 h-40 animate-pulse bg-slate-100">
        <span className="sr-only">Loading slide variants and similar versions</span>
      </Card>
    </div>
  );
}
