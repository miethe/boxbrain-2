import { Card, Stat } from "@/components/ui";

const loadingStats = [
  { label: "Content families", value: "…", hint: "Loading catalog" },
  { label: "Pending reviews", value: "…", hint: "Loading review queues" },
  { label: "Ingestion activity", value: "…", hint: "Loading ingestion jobs" },
  { label: "Plays & Opportunities", value: "…", hint: "Preview module" }
];

export default function HomeLoading() {
  return (
    <div className="route-body" data-testid="home-loading">
      <div className="mb-6">
        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="grid-auto mb-5">
        {loadingStats.map((item) => (
          <Stat key={item.label} {...item} />
        ))}
      </div>
      <div className="two-col">
        <Card className="h-64 animate-pulse bg-slate-100">
          <span className="sr-only">Loading things needing attention</span>
        </Card>
        <Card className="h-64 animate-pulse bg-slate-100">
          <span className="sr-only">Loading BoxBrain suggestions</span>
        </Card>
      </div>
    </div>
  );
}
