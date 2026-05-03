import { CheckCircle2, GitBranch, ShieldCheck, XCircle } from "lucide-react";
import { Button, Card, Meter, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { contentFamilies, reviewItems } from "@/features/demo/data";

export default function ReviewsPage() {
  const selected = reviewItems[0];
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Reviews and governance"
        title="Review AI suggestions before graph changes"
        description="Duplicate, variant, stale, and approval queues keep AI-assisted changes traceable and auditable."
      />
      <div className="three-col">
        <Card className="p-4">
          <h2 className="m-0 text-sm font-bold">Queues</h2>
          <div className="mt-3 grid gap-2">
            {["Duplicate candidates", "Variant links", "Stale content", "Approvals"].map((queue, index) => (
              <button key={queue} className={`flex min-h-12 cursor-pointer items-center justify-between rounded-lg border p-3 text-left text-sm ${index === 0 ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="font-bold">{queue}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs">{index === 0 ? 4 : index + 2}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-3">
          {reviewItems.map((item) => (
            <Card key={item.id} className={`cursor-pointer p-4 ${item.id === selected.id ? "border-blue-300" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.candidate}</div>
                </div>
                <StatusBadge tone={item.priority === "High" ? "danger" : "warn"}>{item.priority}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.rationale}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="ai">{item.confidence}% confidence</StatusBadge>
                <Tag>{item.queue}</Tag>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck size={16} color="var(--ok)" /> Decision panel
          </div>
          <div className="grid grid-cols-2 gap-3">
            {contentFamilies.slice(0, 2).map((family) => (
              <div key={family.id} className="rounded-lg border border-slate-200 p-2">
                <SlideThumb title={family.title} variant={family.thumb} />
                <div className="mt-2 text-xs font-bold">{family.title}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-violet-50 p-3 text-sm text-violet-900">
            AI rationale is stored as a review candidate. Accepting this action will create an audit event and preserve prior state.
          </div>
          <div className="mt-4">
            <Meter value={selected.confidence} label="suggestion confidence" />
          </div>
          <div className="mt-4 grid gap-2">
            <Button variant="primary">
              <GitBranch size={14} /> Mark as variant
            </Button>
            <Button>
              <CheckCircle2 size={14} /> Mark similar only
            </Button>
            <Button>
              <XCircle size={14} /> Reject candidate
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
