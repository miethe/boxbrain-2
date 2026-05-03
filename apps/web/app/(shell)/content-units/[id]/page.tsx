import Link from "next/link";
import { GitBranch, History, MessageSquare, Network, ShieldCheck } from "lucide-react";
import { Button, Card, Meter, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, workProducts } from "@/features/demo/data";

export default async function ContentUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const family = contentFamilies.find((item) => item.id === id) ?? contentFamilies[0];
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="ContentUnit family"
        title={family.title}
        description={family.summary}
        actions={
          <>
            <Link className="btn" href="/variation-explorer">
              <Network size={14} /> Variation explorer
            </Link>
            <Button variant="primary">Add to storyboard</Button>
          </>
        }
      />

      <div className="two-col">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
              <SlideThumb title={family.title} variant={family.thumb} brand="BB" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={family.trust === "approved" ? "ok" : "warn"}>{family.trust}</StatusBadge>
                  <StatusBadge tone={family.freshness === "fresh" ? "ok" : family.freshness === "watch" ? "warn" : "danger"}>{family.freshness}</StatusBadge>
                  {family.restricted && <StatusBadge tone="danger">restricted</StatusBadge>}
                  <StatusBadge tone="ai">AI rationale stored</StatusBadge>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Canonical variant</dt>
                    <dd className="m-0 font-bold">{family.canonicalVariant}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Latest version</dt>
                    <dd className="m-0 font-bold">{family.latestVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Usage</dt>
                    <dd className="m-0 font-bold">{family.usageCount} work products</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Similarity score</dt>
                    <dd className="m-0 font-bold">{family.similarity}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  {family.taxonomy.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="tabs">
              <div className="tab active">Overview</div>
              <div className="tab">Variants</div>
              <div className="tab">Versions</div>
              <div className="tab">Provenance</div>
              <div className="tab">Comments</div>
              <div className="tab">Notes</div>
              <div className="tab">Where-used</div>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              {["Executive", "Board", "Technical"].map((variant, index) => (
                <div key={variant} className="rounded-lg border border-slate-200 p-3">
                  <SlideThumb title={`${family.title} ${variant}`} variant={index === 0 ? family.thumb : index === 1 ? "dark" : "teal"} />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold">{variant}</div>
                    {variant === family.canonicalVariant && <StatusBadge tone="ok">canonical</StatusBadge>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Latest {family.latestVersion} · human reviewed</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck size={16} color="var(--ok)" /> Governance
            </div>
            <div className="grid gap-3">
              <Meter value={family.similarity} label="family quality" />
              <Button>Request approval</Button>
              <Button>Set canonical variant</Button>
              <Button>Deprecate stale version</Button>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <GitBranch size={16} color="var(--primary)" /> Provenance
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{family.provenance}</div>
            <div className="mt-3 text-xs text-slate-500">Major versions require provenance records. AI suggestions remain reviewable candidates.</div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <History size={16} /> Where used
            </div>
            {workProducts.map((wp) => (
              <Link key={wp.id} href={`/work-products/${wp.id}`} className="mb-2 block rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
                {wp.title}
              </Link>
            ))}
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <MessageSquare size={16} /> Comments and notes
            </div>
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg bg-blue-50 p-3">Persistent comment: confirm finance metric ownership.</div>
              <div className="rounded-lg bg-emerald-50 p-3">Curated note: approved for board and executive audiences.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
