import Link from "next/link";
import { CheckCircle2, Download, FileText, Link2, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeader, SlideThumb, StatusBadge } from "@/components/ui";
import { contentFamilies, workProducts } from "@/features/demo/data";

export default function PublishPage() {
  const workProduct = workProducts[0];
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Publish and package"
        title="Final governance review"
        description="Package generation is deferred, but the MVP records manifest-compatible review state and provenance checks."
        actions={
          <>
            <Link className="btn" href={`/work-products/${workProduct.id}`}>Back to WorkProduct</Link>
            <Button variant="primary">
              <Download size={14} /> Export package
            </Button>
          </>
        }
      />
      <div className="three-col">
        <Card className="p-4">
          <SlideThumb title={workProduct.title} variant={workProduct.thumb} brand="BB" />
          <h2 className="mt-4 text-base font-bold">{workProduct.title}</h2>
          <p className="text-sm text-slate-500">{workProduct.summary}</p>
          <div className="mt-3 grid gap-2">
            <StatusBadge tone="ok">snapshot ready</StatusBadge>
            <StatusBadge tone="ok">build manifest compatible</StatusBadge>
            <StatusBadge tone="warn">manual export placeholder</StatusBadge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} color="var(--ok)" /> Review checklist
          </div>
          {[
            "All content has provenance",
            "No unresolved restricted-content exposure",
            "AI suggestions are tied to review records",
            "Comments and notes remain separate",
            "Snapshot is immutable after save"
          ].map((item) => (
            <div key={item} className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={15} /> {item}
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <FileText size={16} /> Manifest slots
          </div>
          {contentFamilies.slice(0, 4).map((family, index) => (
            <div key={family.id} className="mb-2 rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-bold">{index + 1}. {family.title}</div>
              <div className="text-xs text-slate-500">{family.provenance}</div>
            </div>
          ))}
          <Button className="mt-2 w-full">
            <Link2 size={14} /> Copy manifest link
          </Button>
        </Card>
      </div>
    </div>
  );
}
