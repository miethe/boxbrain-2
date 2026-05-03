import Link from "next/link";
import { Filter, Plus, Search, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, ScorePill, SlideThumb, StatusBadge, Tag } from "@/components/ui";
import { askSuggestions, contentFamilies } from "@/features/demo/data";

export default function AskPage() {
  const visibleFamilies = contentFamilies.filter((item) => !item.restricted);
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Ask BoxBrain"
        title="Find trusted content with explainable results"
        description="Natural-language search groups results by family and applies visibility filters before snippets, thumbnails, and ranking are returned."
      />
      <Card className="mb-5 p-5">
        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4">
          <Sparkles size={19} color="var(--ai)" />
          <input className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" defaultValue="approved executive cloud modernization ROI slide" aria-label="Ask BoxBrain query" />
          <Button variant="primary">
            <Search size={15} /> Search
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {askSuggestions.map((suggestion) => (
            <button key={suggestion} className="tag ai cursor-pointer">
              {suggestion}
            </button>
          ))}
        </div>
      </Card>

      <div className="three-col">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Filter size={15} /> Filters
          </div>
          {["Approved only", "Fresh content", "Board audience", "Exclude restricted", "Show debug scores"].map((filter, index) => (
            <label key={filter} className="flex min-h-10 items-center gap-2 border-t border-slate-100 text-sm text-slate-600">
              <input type="checkbox" defaultChecked={index < 4} /> {filter}
            </label>
          ))}
        </Card>

        <div className="grid gap-3">
          {visibleFamilies.map((family) => (
            <Link key={family.id} href={`/content-units/${family.id}`} className="card grid grid-cols-[160px_minmax(0,1fr)] gap-4 p-3 hover:bg-slate-50">
              <SlideThumb title={family.title} variant={family.thumb} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 truncate text-base font-bold">{family.title}</h2>
                  <ScorePill value={family.similarity} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{family.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge tone="ok">visibility checked</StatusBadge>
                  <StatusBadge tone="ai">semantic match</StatusBadge>
                  <Tag>{family.canonicalVariant}</Tag>
                  <Tag>{family.versionCount} versions</Tag>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Card className="p-4">
          <h2 className="m-0 text-sm font-bold">Selected result rationale</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-600">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-bold text-slate-900">Composite score</div>
              <div className="mt-2 grid gap-2">
                {[
                  ["Lexical", "92"],
                  ["Semantic", "94"],
                  ["Trust", "100"],
                  ["Freshness", "96"],
                  ["Usage", "87"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full">
              <Plus size={14} /> Add to storyboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
