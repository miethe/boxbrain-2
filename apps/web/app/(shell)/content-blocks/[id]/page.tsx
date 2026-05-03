import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Button, Card, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies } from "@/features/demo/data";

export default async function ContentBlockPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="ContentBlock"
        title="Three-slide ROI proof story"
        description="An ordered reusable mini-story composed from atomic ContentUnits."
        actions={<Button variant="primary"><Plus size={14} /> Insert into storyboard</Button>}
      />
      <div className="two-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Layers size={16} /> Ordered members
          </div>
          <div className="grid gap-3">
            {contentFamilies.slice(0, 3).map((family, index) => (
              <Link href={`/content-units/${family.id}`} key={family.id} className="grid grid-cols-[36px_150px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-sm font-black text-blue-700">{index + 1}</div>
                <SlideThumb title={family.title} variant={family.thumb} />
                <div>
                  <div className="text-sm font-bold">{family.title}</div>
                  <div className="text-xs text-slate-500">{family.summary}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="m-0 text-sm font-bold">Governance</h2>
          <div className="mt-3 grid gap-2">
            <StatusBadge tone="ok">ordered composition preserved</StatusBadge>
            <StatusBadge tone="ok">source units retain provenance</StatusBadge>
            <StatusBadge tone="ai">recommended for economic case gap</StatusBadge>
            <Tag>Executive</Tag>
            <Tag>ROI</Tag>
            <Tag>Board-ready</Tag>
          </div>
        </Card>
      </div>
    </div>
  );
}
