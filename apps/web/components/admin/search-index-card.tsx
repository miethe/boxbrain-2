import { Database, ShieldAlert } from "lucide-react";
import { Card, SectionHead, StatusBadge, Tag } from "@/components/ui";
import type { AdminHealth } from "@/lib/api";
import { getSearchIndexEmbeddings, normalizeSearchEvalCases } from "@/features/admin/lib";

/** Surfaces `AdminHealth.searchIndex` and `AdminHealth.searchEval`, both already typed in
 * `lib/api.ts` but never read by the Admin page (audit-digest.md ## admin-ingestion, gap "Pipeline
 * stage, queue, and search-index/eval telemetry computed by the backend is never surfaced"). */
export function SearchIndexCard({ searchIndex }: { searchIndex: AdminHealth["searchIndex"] }) {
  const rows: Array<{ label: string; value: number | undefined; restricted: number | undefined }> = [
    { label: "ContentUnit versions", value: searchIndex?.searchableContentUnitVersions, restricted: searchIndex?.restrictedContentUnitVersions },
    { label: "WorkProduct versions", value: searchIndex?.searchableWorkProductVersions, restricted: searchIndex?.restrictedWorkProductVersions },
    { label: "ContentBlocks", value: searchIndex?.searchableContentBlocks, restricted: searchIndex?.restrictedContentBlocks }
  ];
  const { embeddings, embeddingTargetCounts } = getSearchIndexEmbeddings(searchIndex);
  const embeddingTargets = Object.entries(embeddingTargetCounts);

  return (
    <Card className="overflow-hidden" data-testid="admin-search-index">
      <div className="border-b border-slate-200 p-4">
        <SectionHead
          action={
            <Tag>
              <Database size={11} /> {searchIndex?.backend ?? "unknown"} backend
            </Tag>
          }
        >
          Search index
        </SectionHead>
        <p className="m-0 mt-1 text-sm text-slate-500">Searchable and restriction-flagged object counts by type (`AdminHealth.searchIndex`).</p>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Object type</th>
              <th className="num">Searchable</th>
              <th className="num">Restricted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="font-semibold text-slate-800">{row.label}</td>
                <td className="num">{row.value ?? 0}</td>
                <td className="num">
                  {(row.restricted ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <ShieldAlert size={12} aria-hidden="true" /> {row.restricted}
                    </span>
                  ) : (
                    (row.restricted ?? 0)
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold text-slate-800">Embeddings</td>
              <td className="num" colSpan={2}>
                {embeddings}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {embeddingTargets.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 pt-0">
          {embeddingTargets.map(([target, count]) => (
            <Tag key={target}>
              {target}: {count}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Renders `AdminHealth.searchEval` — pass/fail search-quality relevance cases run against the live
 * catalog, including restricted-exclusion verification. */
export function SearchEvalCard({ searchEval }: { searchEval: AdminHealth["searchEval"] }) {
  const status = searchEval?.status ?? "pass";
  const tone = status === "pass" ? "ok" : status === "warn" ? "warn" : "danger";
  const cases = normalizeSearchEvalCases(searchEval?.cases);

  return (
    <Card className="overflow-hidden" data-testid="admin-search-eval">
      <div className="border-b border-slate-200 p-4">
        <SectionHead action={<StatusBadge tone={tone}>{status}</StatusBadge>}>Search quality eval</SectionHead>
        <p className="m-0 mt-1 text-sm text-slate-500">
          {searchEval?.passedCases ?? 0} of {searchEval?.totalCases ?? 0} relevance/eval cases passing (`AdminHealth.searchEval`).
        </p>
      </div>
      {cases.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">No search-quality eval cases have run yet.</div>
      ) : (
        <div className="grid gap-2 p-3">
          {cases.map((testCase) => (
            <div key={testCase.name} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">{testCase.name.replaceAll("_", " ")}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    query “{testCase.query}” as {testCase.role}
                  </div>
                </div>
                <StatusBadge tone={testCase.passed ? "ok" : "danger"}>{testCase.passed ? "pass" : "fail"}</StatusBadge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                <Tag>{testCase.resultCount} results</Tag>
                {testCase.topScore !== null && <Tag>top score {testCase.topScore.toFixed(2)}</Tag>}
                {testCase.topTitle && <Tag>top: {testCase.topTitle}</Tag>}
              </div>
              {testCase.notes.length > 0 && <p className="m-0 mt-2 text-xs text-slate-500">{testCase.notes.join(" ")}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
