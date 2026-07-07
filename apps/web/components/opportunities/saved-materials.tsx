import { FileText, Filter, Upload } from "lucide-react";
import { Card } from "@/components/ui";
import { matchTone, savedMaterials } from "@/features/opportunities/data";

export function SavedMaterials() {
  return (
    <Card className="p-3.5" data-testid="opportunity-saved-materials">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-xs font-bold uppercase tracking-[0.04em] text-slate-700">Saved Candidate Materials</b>
        <div className="flex items-center gap-1">
          <span className="count-inline">{savedMaterials.length} items</span>
          <button type="button" className="icon-btn borderless" aria-label="Filter saved materials" aria-disabled="true">
            <Filter size={11} aria-hidden="true" />
          </button>
        </div>
      </div>
      {savedMaterials.map((item, index) => (
        <div key={item.title} className={`flex items-center gap-2 py-2.5 ${index < savedMaterials.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}>
          <span className="file-icon doc sm">
            <FileText size={10} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate font-medium text-slate-900">{item.title}</div>
            <div className="text-slate-500">{item.detail}</div>
          </div>
          <span className={`match-score sm ${matchTone(item.match)}`}>{item.match}</span>
        </div>
      ))}
      <div className="mt-3 flex flex-col items-center gap-1 rounded-[10px] border-[1.5px] border-dashed border-[var(--line-2)] p-5 text-center text-xs text-slate-500">
        <Upload size={16} aria-hidden="true" />
        <div>Drop files here or browse</div>
      </div>
    </Card>
  );
}
