import { Card, PageHeader } from "@/components/ui";

export default function LibraryLoading() {
  return (
    <div className="route-body" data-testid="library-page">
      <PageHeader eyebrow="Library" title="Content Unit Library" description="Find the right content — organized by family, variant, and version." />
      <div className="h-9 max-w-xl animate-pulse rounded-md bg-slate-100" />
      <div className="tabs mb-4 mt-4">
        <div className="tab">All</div>
        <div className="tab">Work Products</div>
        <div className="tab active">Content Units</div>
        <div className="tab">Plays</div>
        <div className="tab">Collections</div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <div className="grid gap-5" style={{ gridTemplateColumns: "220px 1fr" }}>
          <Card className="h-64 animate-pulse bg-slate-100">
            <span className="sr-only">Loading filters</span>
          </Card>
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[190px_minmax(0,1fr)_120px]">
                  <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
                  <div className="grid content-start gap-3">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="grid content-start gap-2">
                    <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <Card className="h-80 animate-pulse bg-slate-100">
          <span className="sr-only">Loading Similarity Preview</span>
        </Card>
      </div>
    </div>
  );
}
