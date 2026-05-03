import Link from "next/link";
import { Download, FileText, Layers, PackageCheck, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, workProducts } from "@/features/demo/data";

export default async function WorkProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workProduct = workProducts.find((item) => item.id === id) ?? workProducts[0];
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="WorkProduct detail"
        title={workProduct.title}
        description={workProduct.summary}
        actions={
          <>
            <Link className="btn" href="/storyboards/sb-cloud-modernization">
              <Layers size={14} /> Storyboard
            </Link>
            <Link className="btn btn-primary" href="/publish">
              <PackageCheck size={14} /> Publish review
            </Link>
          </>
        }
      />
      <div className="two-col">
        <Card className="overflow-hidden">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1fr)]">
            <SlideThumb title={workProduct.title} variant={workProduct.thumb} brand="BB" />
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={workProduct.status === "approved" ? "ok" : "warn"}>{workProduct.status}</StatusBadge>
                <Tag>{workProduct.version}</Tag>
                <Tag>{workProduct.slideCount} slides</Tag>
                <StatusBadge tone="ai">indexed</StatusBadge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Owner</dt>
                  <dd className="m-0 font-bold">{workProduct.owner}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="m-0 font-bold">{workProduct.updatedAt}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="m-0 font-bold">{workProduct.type}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Source</dt>
                  <dd className="m-0 font-bold">PPTX upload</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button>
                  <Download size={14} /> Original
                </Button>
                <Button>
                  <FileText size={14} /> Build manifest
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">
            Ingestion job completed with rendered previews, text extraction, source order, and provenance records.
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} color="var(--ok)" /> Governance checklist
          </div>
          {["All restricted units are permission checked", "Approved content has provenance", "Snapshot-compatible manifest is ready", "AI metadata is traceable"].map((item) => (
            <div key={item} className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{item}</div>
          ))}
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="m-0 text-base font-bold">Contained ContentUnits</h2>
          <p className="m-0 text-sm text-slate-500">Each slide/page is modeled as one atomic unit with ordered source membership.</p>
        </div>
        <div className="grid-auto p-4">
          {contentFamilies.map((family, index) => (
            <Link href={`/content-units/${family.id}`} key={family.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <SlideThumb title={family.title} variant={family.thumb} />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold">{index + 1}. {family.title}</div>
                <StatusBadge tone={family.trust === "approved" ? "ok" : "warn"}>{family.trust}</StatusBadge>
              </div>
              <div className="mt-1 text-xs text-slate-500">{family.provenance}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
