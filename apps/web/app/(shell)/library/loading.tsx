import { Card, PageHeader } from "@/components/ui";

export default function LibraryLoading() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Library" title="Family-first governed catalog" description="Loading governed family and WorkProduct cards." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="grid gap-4">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="overflow-hidden">
              <div className="grid gap-4 p-4 md:grid-cols-[190px_minmax(0,1fr)_150px]">
                <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
                <div className="grid content-start gap-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="grid content-start gap-2">
                  <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-80 animate-pulse bg-slate-100">
          <span className="sr-only">Loading WorkProducts</span>
        </Card>
      </div>
    </div>
  );
}
