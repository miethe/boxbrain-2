import { PageHeader, Card } from "@/components/ui";

export default function LoadingContentBlock() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="ContentBlock" title="Loading ContentBlock" description="Loading ordered members, Storyboard insert targets, and governance state." />
      <div className="two-col">
        <Card className="h-80 animate-pulse bg-slate-100"><span className="sr-only">Loading members</span></Card>
        <Card className="h-64 animate-pulse bg-slate-100"><span className="sr-only">Loading controls</span></Card>
      </div>
    </div>
  );
}
