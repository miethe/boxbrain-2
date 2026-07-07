import type { ReviewItem } from "@/lib/api";

/**
 * Real client-side export of the currently loaded review items. The design's header "Export"
 * button has no backing API route (audit-digest.md ## reviews, API[no]) so this downloads a CSV
 * built from data already fetched from the live API rather than calling a nonexistent endpoint.
 */
export function downloadReviewItemsCsv(items: ReviewItem[], filename: string) {
  const header = ["id", "queueType", "status", "confidence", "suggestedAction", "source", "createdAt", "targetIds"];
  const rows = items.map((item) => [
    item.id,
    item.queueType,
    item.status,
    item.confidence != null ? String(item.confidence) : "",
    item.suggestedAction ?? "",
    item.source,
    item.createdAt,
    item.targetRefs
      .map((target) => target.versionId ?? target.id ?? "")
      .filter(Boolean)
      .join("|")
  ]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
