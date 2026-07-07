import { Card } from "@/components/ui";

export default function AskLoading() {
  return (
    <div className="route-body">
      <div className="two-col items-start">
        <div className="min-w-0">
          <div className="page-head-row">
            <div>
              <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <Card className="mt-4 p-4">
            <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
          </Card>
          <Card className="mt-6 p-4">
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
        </div>
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
