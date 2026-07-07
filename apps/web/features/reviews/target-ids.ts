import type { ReviewTargetRef } from "@/lib/api";

/** The review API's targetRefs only reliably carry {objectType, id}; versionId/title are optional. */
export function targetVersionId(target?: ReviewTargetRef): string | undefined {
  if (!target) return undefined;
  if (target.versionId) return target.versionId;
  if (target.objectType === "content_unit_version" && target.id) return target.id;
  return undefined;
}
