import Link from "next/link";
import { BookOpen, Lock, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, StatusBadge, Tag } from "@/components/ui";

export default function PlaysPage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Preview-only module"
        title="Plays"
        description="Plays remain a future first-class workflow. This MVP keeps the screen visible as a polished preview backed by seed data."
        actions={<Button><Lock size={14} /> Limited preview</Button>}
      />
      <div className="grid-auto">
        {["Executive Expansion Play", "Cloud Modernization Narrative", "Competitive Battlecard", "Technical Discovery Workshop"].map((play, index) => (
          <Card key={play} className="p-4">
            <div className="mb-4 grid h-20 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <BookOpen size={28} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-base font-bold">{play}</h2>
              <StatusBadge tone={index === 1 ? "ai" : "ok"}>{index === 1 ? "suggested" : "trusted"}</StatusBadge>
            </div>
            <p className="text-sm text-slate-500">Future workflow for repeatable narrative orchestration and family/variant/version governance.</p>
            <div className="flex flex-wrap gap-2">
              <Tag>Preview</Tag>
              <Tag>{index + 4} steps</Tag>
              <Tag>{20 + index * 8} uses</Tag>
            </div>
            <Link className="btn mt-4" href="/storyboards/sb-cloud-modernization">
              <Sparkles size={14} /> View related storyboard
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
