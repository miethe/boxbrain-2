import Link from "next/link";
import { AlertTriangle, Camera, GripVertical, PackageCheck, Plus, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, storyboardSections } from "@/features/demo/data";

export default async function StoryboardPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Storyboard workspace"
        title="Cloud Modernization Executive Storyboard"
        description="A structured composition workspace with sections, slots, gaps, diagnostics, comments, and immutable snapshots."
        actions={
          <>
            <Button>
              <Camera size={14} /> Save snapshot
            </Button>
            <Link className="btn btn-primary" href="/publish">
              <PackageCheck size={14} /> Publish review
            </Link>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1.4fr)_340px]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-sm font-bold">Library tray</h2>
            <StatusBadge tone="ai">ranked</StatusBadge>
          </div>
          <div className="grid gap-3">
            {contentFamilies.map((family) => (
              <div key={family.id} className="rounded-lg border border-slate-200 p-2">
                <SlideThumb title={family.title} variant={family.thumb} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-bold">{family.title}</div>
                  <GripVertical size={14} className="text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {storyboardSections.map((section, sectionIndex) => (
            <Card key={section.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.07em] text-slate-500">Section {sectionIndex + 1}</div>
                  <h2 className="m-0 text-base font-bold">{section.title}</h2>
                  <p className="m-0 text-sm text-slate-500">{section.goal}</p>
                </div>
                <Button>
                  <Plus size={14} /> Slot
                </Button>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {section.slots.map((slot) => (
                  <div key={slot.id} className={`rounded-lg border p-3 ${slot.state === "gap" ? "border-dashed border-amber-300 bg-amber-50" : slot.state === "warning" ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold">{slot.title}</div>
                      {slot.state === "gap" ? <Tag tone="warn">gap</Tag> : slot.state === "warning" ? <Tag tone="warn">check</Tag> : <StatusBadge tone="ok">{slot.trust}</StatusBadge>}
                    </div>
                    {slot.content ? (
                      <SlideThumb title={slot.content} variant={slot.state === "warning" ? "dark" : "light"} />
                    ) : (
                      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-amber-300 bg-white/70 text-center text-sm font-semibold text-amber-700">
                        Recommendation needed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <AlertTriangle size={16} color="var(--warn)" /> Diagnostics
            </div>
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg bg-amber-50 p-3 text-amber-800">2 open gap slots need recommendations.</div>
              <div className="rounded-lg bg-orange-50 p-3 text-orange-800">1 selected slot uses content under review.</div>
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">No restricted content visible to current role.</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Sparkles size={16} color="var(--ai)" /> Ask about this story
            </div>
            <textarea className="min-h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" defaultValue="Find a fresher proof slide for the architecture section." />
            <Button className="mt-3 w-full" variant="primary">Generate candidates</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
