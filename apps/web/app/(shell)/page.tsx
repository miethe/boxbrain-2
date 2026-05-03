import Link from "next/link";
import { ArrowRight, FileUp, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, SlideThumb, StatCard, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, reviewItems, stats, storyboardSections, workProducts } from "@/features/demo/data";

export default function HomePage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Governed content graph"
        title="BoxBrain operating console"
        description="A governed catalog, review queue, and composition workspace for reusable enterprise materials."
        actions={
          <>
            <Link className="btn" href="/library">
              Browse library
            </Link>
            <Link className="btn btn-primary" href="/ask">
              <Sparkles size={15} /> Ask BoxBrain
            </Link>
          </>
        }
      />

      <div className="grid-auto mb-5">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="two-col">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 className="m-0 text-base font-bold">Active ingestion and catalog health</h2>
              <p className="m-0 text-sm text-slate-500">PPTX-first pipeline with provenance and review routing.</p>
            </div>
            <Button>
              <FileUp size={14} /> Upload deck
            </Button>
          </div>
          <div className="grid gap-3 p-4">
            {workProducts.map((wp) => (
              <Link href={`/work-products/${wp.id}`} key={wp.id} className="grid grid-cols-[132px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <SlideThumb title={wp.title} variant={wp.thumb} brand="BB" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 truncate text-sm font-bold">{wp.title}</h3>
                    <StatusBadge tone={wp.status === "approved" ? "ok" : "warn"}>{wp.status}</StatusBadge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{wp.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <Tag>{wp.version}</Tag>
                    <Tag>{wp.slideCount} slides</Tag>
                    <Tag>{wp.owner}</Tag>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} color="var(--ok)" />
              <h2 className="m-0 text-base font-bold">Reviews needing judgment</h2>
            </div>
            <div className="mt-3 grid gap-3">
              {reviewItems.slice(0, 3).map((item) => (
                <Link key={item.id} href="/reviews" className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.rationale}</div>
                    </div>
                    <StatusBadge tone={item.priority === "High" ? "danger" : "warn"}>{item.priority}</StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-bold">Storyboard snapshot</h2>
                <p className="m-0 text-sm text-slate-500">Sections, slots, gaps, and trust warnings.</p>
              </div>
              <Link href="/storyboards/sb-cloud-modernization" className="btn">
                Open <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 grid gap-2">
              {storyboardSections.map((section) => (
                <div key={section.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-sm font-bold">{section.title}</div>
                  <div className="mt-2 flex gap-1">
                    {section.slots.map((slot) => (
                      <span key={slot.id} className={`h-2 flex-1 rounded-full ${slot.state === "gap" ? "bg-amber-300" : slot.state === "warning" ? "bg-orange-400" : "bg-emerald-500"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <GitBranch size={18} color="var(--primary)" />
          <h2 className="m-0 text-base font-bold">Family-first content signal</h2>
        </div>
        <div className="grid-auto">
          {contentFamilies.slice(0, 3).map((family) => (
            <Link key={family.id} href={`/content-units/${family.id}`} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <SlideThumb title={family.title} variant={family.thumb} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0 text-sm font-bold">{family.title}</div>
                <StatusBadge tone={family.trust === "approved" ? "ok" : "warn"}>{family.trust}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{family.summary}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
