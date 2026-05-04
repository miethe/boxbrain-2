import { Card, PageHeader } from "@/components/ui";

export default function AskLoading() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Ask BoxBrain" title="Ask and search governed content" description="Loading retrieval workspace." />
      <Card className="mb-5 p-4">
        <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </Card>
      <div className="three-col">
        <Card className="p-4">
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-9 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="grid gap-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
                <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
                <div className="grid content-center gap-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="grid gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
