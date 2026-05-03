import Link from "next/link";
import { ArrowLeft, GitBranch, Network } from "lucide-react";
import { Card, PageHeader, ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies } from "@/features/demo/data";

export default function VariationExplorerPage() {
  const current = contentFamilies[0];
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Variation explorer"
        title="Cloud Modernization ROI variation map"
        description="Similarity edges help discovery, but do not imply shared family identity until reviewed."
        actions={<Link className="btn" href={`/content-units/${current.id}`}><ArrowLeft size={14} /> Back to detail</Link>}
      />
      <div className="three-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <GitBranch size={16} /> Family variants
          </div>
          {["Executive", "Board", "Technical", "EMEA"].map((variant, index) => (
            <div key={variant} className="mb-3 rounded-lg border border-slate-200 p-3">
              <SlideThumb title={`${variant} ROI`} variant={index === 0 ? "light" : index === 1 ? "dark" : index === 2 ? "teal" : "purple"} />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold">{variant}</div>
                {index === 0 && <StatusBadge tone="ok">canonical</StatusBadge>}
              </div>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <div className="mx-auto max-w-lg">
            <SlideThumb title={current.title} variant={current.thumb} brand="BB" />
            <div className="mt-4 text-center">
              <h2 className="m-0 text-2xl font-bold">{current.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{current.summary}</p>
              <div className="mt-4 flex justify-center gap-2">
                <ScorePill value={98} label="canonical fit" />
                <Tag>v3.2</Tag>
                <Tag>47 uses</Tag>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Network size={16} /> Similar but separate
          </div>
          {contentFamilies.slice(1).map((family) => (
            <Link href={`/content-units/${family.id}`} key={family.id} className="mb-3 block rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold">{family.title}</div>
                <ScorePill value={family.similarity} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{family.summary}</p>
              <div className="mt-2">
                <StatusBadge tone="ai">review candidate only</StatusBadge>
              </div>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
