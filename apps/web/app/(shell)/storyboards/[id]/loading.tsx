import { Card, PageHeader } from "@/components/ui";

export default function LoadingStoryboard() {
  return (
    <div className="route-body">
      <PageHeader eyebrow="Storyboard workspace" title="Loading Storyboard" description="Loading draft sections, diagnostics, comments, and immutable snapshots." />
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1.4fr)_360px]">
        <Card className="h-80 animate-pulse bg-slate-100"><span className="sr-only">Loading tray</span></Card>
        <Card className="h-96 animate-pulse bg-slate-100"><span className="sr-only">Loading sections</span></Card>
        <Card className="h-80 animate-pulse bg-slate-100"><span className="sr-only">Loading diagnostics</span></Card>
      </div>
    </div>
  );
}
