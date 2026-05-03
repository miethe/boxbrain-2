import Link from "next/link";
import { Building2, Lock, Target } from "lucide-react";
import { Button, Card, Meter, PageHeader, StatusBadge, Tag } from "@/components/ui";

export default function OpportunitiesPage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Preview-only module"
        title="Opportunity workspace"
        description="Full opportunity orchestration is deferred until catalog, search, reviews, and storyboard workflows are stable."
        actions={<Button><Lock size={14} /> Limited preview</Button>}
      />
      <div className="two-col">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-700">
                <Building2 size={16} /> Acme Global Expansion
              </div>
              <h2 className="m-0 text-2xl font-bold">$4.2M modernization pursuit</h2>
              <p className="max-w-2xl text-sm text-slate-500">Preview context for future account-specific recommendations, Plays, WorkProducts, ContentUnits, saved selections, and outcome feedback.</p>
            </div>
            <Meter value={78} label="fit" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Tag>Manufacturing</Tag>
            <Tag>EMEA + NA</Tag>
            <Tag>Executive sponsor</Tag>
            <StatusBadge tone="ai">recommendations preview</StatusBadge>
          </div>
          <Link className="btn btn-primary mt-5" href="/storyboards/sb-cloud-modernization">
            <Target size={14} /> Open opportunity storyboard preview
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="m-0 text-base font-bold">Top preview recommendations</h2>
          {["Cloud Modernization Executive Overview", "Three-slide ROI proof story", "Migration Architecture Path", "EMEA Customer Proof"].map((item) => (
            <div key={item} className="mt-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
              {item}
              <div className="mt-1 text-xs font-normal text-slate-500">Recommendation is read-only in MVP.</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
