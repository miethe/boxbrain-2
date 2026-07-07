import { CheckCircle2, ChevronDown, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { Button, Meter } from "@/components/ui";
import type { ApprovalState, ContentUnitVariant, ContentUnitVersionDetail, FreshnessState } from "@/lib/api";
import { normalizeScore } from "@/features/content-units/lib";

const approvalOptions: ApprovalState[] = ["draft", "review", "approved", "deprecated", "archived"];
const freshnessOptions: FreshnessState[] = ["fresh", "aging", "stale"];

/**
 * Governance write-actions (approval / freshness / canonical) have no equivalent element in the
 * visual design mock-ups, but CLAUDE.md requires them to keep working with audit events. Rendered as
 * a persistent, collapsible disclosure so it survives outer-tab switching instead of being hidden
 * behind a tab the design never gave it (this preserves 100% of the pre-existing write wiring).
 */
export function GovernancePanel({
  pageId,
  version,
  variantOptions,
  currentVariantId,
  updateApprovalAction,
  updateFreshnessAction,
  setCanonicalVariantAction
}: {
  pageId: string;
  version?: ContentUnitVersionDetail;
  variantOptions: ContentUnitVariant[];
  currentVariantId?: string;
  updateApprovalAction: (formData: FormData) => void | Promise<void>;
  updateFreshnessAction: (formData: FormData) => void | Promise<void>;
  setCanonicalVariantAction: (formData: FormData) => void | Promise<void>;
}) {
  const quality = normalizeScore(version?.qualityScore) ?? 0;

  return (
    <details className="card mt-4 p-4" data-testid="content-unit-governance-panel">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[var(--ink)]">
        <ShieldCheck size={16} color="var(--ok)" aria-hidden="true" /> Governance actions
        <ChevronDown size={14} className="ml-auto text-[var(--ink-3)]" aria-hidden="true" />
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Meter value={quality} label="quality score" />
        {version ? (
          <>
            <form action={updateApprovalAction} className="grid gap-2 rounded-lg border border-[var(--line)] p-3 lg:col-start-1">
              <input type="hidden" name="pageId" value={pageId} />
              <input type="hidden" name="versionId" value={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-[var(--ink-3)]">
                Approval
                <select name="approvalState" defaultValue={version.approvalState} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-semibold normal-case text-[var(--ink)]">
                  {approvalOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <input name="notes" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Decision note" />
              <Button type="submit" className="justify-center">
                <CheckCircle2 size={14} /> Update approval
              </Button>
            </form>

            <form action={updateFreshnessAction} className="grid gap-2 rounded-lg border border-[var(--line)] p-3">
              <input type="hidden" name="pageId" value={pageId} />
              <input type="hidden" name="versionId" value={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-[var(--ink-3)]">
                Freshness
                <select name="freshnessState" defaultValue={version.freshnessState ?? "aging"} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-semibold normal-case text-[var(--ink)]">
                  {freshnessOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <input name="notes" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Freshness note" />
              <Button type="submit" className="justify-center">
                <RefreshCw size={14} /> Update freshness
              </Button>
            </form>

            <form action={setCanonicalVariantAction} className="grid gap-2 rounded-lg border border-[var(--line)] p-3">
              <input type="hidden" name="pageId" value={pageId} />
              <input type="hidden" name="versionId" value={version.id} />
              <label className="grid gap-1 text-xs font-bold uppercase text-[var(--ink-3)]">
                Canonical variant
                {variantOptions.length > 0 ? (
                  <select name="variantId" defaultValue={currentVariantId ?? version.variantId} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-semibold normal-case text-[var(--ink)]">
                    {variantOptions.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.variantLabel}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="variantId" value={version.variantId} />
                    <div className="rounded-md bg-[var(--bg-2)] px-2 py-1.5 text-sm normal-case text-[var(--ink-2)]">{version.variantId}</div>
                  </>
                )}
              </label>
              <input name="reason" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Canonical reason" />
              <Button type="submit" className="justify-center">
                <Star size={14} /> Set canonical
              </Button>
            </form>
          </>
        ) : (
          <div className="rounded-lg border border-[var(--line)] p-3 text-sm text-[var(--ink-3)] lg:col-span-2">No version is selected, so write controls are unavailable.</div>
        )}
      </div>
    </details>
  );
}
