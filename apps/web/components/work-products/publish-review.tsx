"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  File,
  FileText,
  Globe,
  Info,
  Mic,
  Package,
  Plus,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Button, Card, IconButton, StatusBadge } from "@/components/ui";
import {
  ComingSoonPanel,
  DataBadge,
  DeckThumb,
  EmptyInline,
  MiniStatusRow,
  RailCard,
  SectionLabel
} from "@/components/work-products/primitives";
import type { WorkProductVersionDetail } from "@/lib/api";
import { approvalTone, formatDateTime, statusChipsFor, thumbVariantForIndex, titleCase } from "@/features/work-products/lib";

type PublishMode = "release" | "patch" | "preview";

const packageOutputs = [
  { key: "pptx", title: "PowerPoint (.pptx)", description: "Native editable deck output", icon: Package },
  { key: "pdf", title: "PDF (.pdf)", description: "Flattened review copy", icon: FileText },
  { key: "hosted", title: "Hosted View Link", description: "Trackable shareable link", icon: Globe },
  { key: "brief", title: "Executive Summary", description: "AI-generated one-page summary", icon: File, ai: true },
  { key: "speaker", title: "Speaker Notes Package", description: "AI-generated presenter notes", icon: Mic, ai: true },
  { key: "kit", title: "Deck Kit (.zip)", description: "Source assets and notes bundle", icon: Archive }
];

const publishSteps = [
  { label: "Build", done: true },
  { label: "Storyboard", done: true },
  { label: "Review & Approve", done: true },
  { label: "Package", active: true },
  { label: "Publish" },
  { label: "Distribute" }
];

export function PublishReview({ workProduct, apiBaseUrl }: { workProduct: WorkProductVersionDetail; apiBaseUrl: string }) {
  const [publishMode, setPublishMode] = useState<PublishMode>("release");
  const [previewIndex, setPreviewIndex] = useState(0);
  const statusChips = statusChipsFor(workProduct);
  const totalSlides = Math.max(workProduct.filmstrip.length, 1);
  const checks = buildChecklist(workProduct);
  const passedCount = checks.filter((check) => check.status === "ok").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;

  return (
    <div className="route-body pb-24" data-testid="publish-review-screen">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary-bg)] text-[var(--primary)]">
            <Rocket size={18} aria-hidden="true" />
          </span>
          <div>
            <div className="mb-1 text-xs font-semibold text-[var(--primary)]">
              <Link href={`/work-products/${workProduct.id}`} className="link">
                {workProduct.title}
              </Link>
              <span className="mx-2 text-[var(--ink-4)]">/</span>
              <span className="text-[var(--ink-3)]">Publish & Package</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-[22px] font-bold tracking-tight text-[var(--ink)]">Publish & Package</h1>
              <StatusBadge tone={approvalTone(workProduct.approvalState)}>{titleCase(workProduct.approvalState)}</StatusBadge>
            </div>
            <div className="mt-1 text-xs text-[var(--ink-3)]">
              {workProduct.title} · <span className="mono">{workProduct.versionNumber}</span> · final review before release
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn btn-sm" href={`/work-products/${workProduct.id}`}>
            <ChevronLeft size={13} aria-hidden="true" /> Back to Detail
          </Link>
          <Button size="sm" type="button" disabled title="Draft persistence is not exposed yet">
            <Save size={13} aria-hidden="true" /> Save Draft
          </Button>
          <span className="btn-split">
            <button className="btn btn-primary btn-sm" type="button" disabled title="Publish/package API is not exposed yet">
              <Rocket size={13} aria-hidden="true" /> Publish {workProduct.versionNumber}
            </button>
            <button className="btn btn-primary btn-sm" type="button" disabled aria-label="Open publish menu">
              <ChevronDown size={12} aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <Stepper />

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          <DeckPreviewStrip workProduct={workProduct} apiBaseUrl={apiBaseUrl} previewIndex={previewIndex} setPreviewIndex={setPreviewIndex} totalSlides={totalSlides} />

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <VersionSummary workProduct={workProduct} />
            <PublishModeCard publishMode={publishMode} setPublishMode={setPublishMode} />
          </div>

          <ApprovalChecklist checks={checks} passedCount={passedCount} warningCount={warningCount} />

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <PackageOutputs />
            <ProvenanceRights workProduct={workProduct} />
          </div>

          <AudienceUseCase />
          <AiRecommendations />
          <DistributionPreview />
        </div>

        <PublishRightRail workProduct={workProduct} statusChips={statusChips} passedCount={passedCount} warningCount={warningCount} />
      </div>

      <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3 shadow-lg">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--primary-bg)] text-[var(--primary)]">
          <Rocket size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <b>Package review is scoped to {workProduct.versionNumber}</b>
          <span className="ml-2 text-[11px] text-[var(--ink-3)]">{warningCount} warning(s) · package and publish APIs pending</span>
        </div>
        <Button size="sm" type="button" disabled>
          Schedule
        </Button>
        <Button size="sm" type="button" disabled>
          Publish Preview First
        </Button>
        <Button size="sm" variant="primary" type="button" disabled>
          <Rocket size={13} aria-hidden="true" /> Publish Now
        </Button>
      </div>
    </div>
  );
}

function Stepper() {
  return (
    <Card className="p-3">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-xs">
        {publishSteps.map((step, index) => (
          <div key={step.label} className="flex min-w-fit flex-1 items-center gap-2">
            <div className={`flex items-center gap-2 font-semibold ${step.active ? "text-[var(--primary)]" : step.done ? "text-[var(--ok)]" : "text-[var(--ink-3)]"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${step.active ? "bg-[var(--primary)] text-white" : step.done ? "bg-[var(--ok)] text-white" : "bg-[var(--bg-2)] text-[var(--ink-3)]"}`}>
                {step.done ? <Check size={11} aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
            </div>
            {index < publishSteps.length - 1 && <div className={`h-0.5 min-w-10 flex-1 ${step.done ? "bg-[var(--ok)]" : "bg-[var(--line)]"}`} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeckPreviewStrip({
  workProduct,
  apiBaseUrl,
  previewIndex,
  setPreviewIndex,
  totalSlides
}: {
  workProduct: WorkProductVersionDetail;
  apiBaseUrl: string;
  previewIndex: number;
  setPreviewIndex: (value: number) => void;
  totalSlides: number;
}) {
  const previews = workProduct.filmstrip.length > 0 ? workProduct.filmstrip : [];
  const current = previews[previewIndex];
  return (
    <Card className="p-4" data-testid="publish-deck-preview-strip">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[13px] font-bold">Deck Preview</h2>
          <span className="text-[11px] text-[var(--ink-3)]">{totalSlides} slides</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="xs" type="button" disabled>
            <Eye size={11} aria-hidden="true" /> Preview Full
          </Button>
          <Button size="xs" type="button" disabled>
            <ExternalLink size={11} aria-hidden="true" /> Open
          </Button>
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        <DeckThumb
          title={current?.summary ?? workProduct.title}
          brand="BOXBRAIN"
          variant={thumbVariantForIndex(previewIndex)}
          uri={current?.thumbnailUri ?? current?.renderUri ?? workProduct.previewUri}
          apiBaseUrl={apiBaseUrl}
          active
        />
        {Array.from({ length: Math.min(5, totalSlides) }, (_, index) => {
          const item = previews[index];
          return (
            <button
              key={item?.id ?? index}
              type="button"
              className={`rounded-md text-left ${previewIndex === index ? "ring-2 ring-[var(--primary)]" : "opacity-80 hover:opacity-100"}`}
              onClick={() => setPreviewIndex(index)}
            >
              <DeckThumb
                title={item?.summary ?? `Slide ${index + 1}`}
                brand="BB"
                variant={thumbVariantForIndex(index)}
                uri={item?.thumbnailUri ?? item?.renderUri}
                apiBaseUrl={apiBaseUrl}
                compact
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ink-3)]">
        <span>
          <span className="mono">{previewIndex + 1} / {totalSlides}</span> slides
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Previous publish preview slide" borderless className="h-6 w-6" disabled={previewIndex === 0} onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}>
            <ChevronLeft size={12} aria-hidden="true" />
          </IconButton>
          <IconButton label="Next publish preview slide" borderless className="h-6 w-6" disabled={previewIndex >= totalSlides - 1} onClick={() => setPreviewIndex(Math.min(totalSlides - 1, previewIndex + 1))}>
            <ChevronRight size={12} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

function VersionSummary({ workProduct }: { workProduct: WorkProductVersionDetail }) {
  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Version Summary</h2>
        <button className="link text-[11px]" type="button" disabled>
          Compare to previous
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <span className="text-[var(--ink-3)]">Current</span>
        <span>
          <span className="mono rounded bg-[var(--primary-bg)] px-1.5 py-0.5 font-semibold text-[var(--primary)]">{workProduct.versionNumber}</span>
        </span>
        <span className="text-[var(--ink-3)]">Contributors</span>
        <span className="text-[var(--ink-3)]">Not exposed by WorkProduct API</span>
        <span className="text-[var(--ink-3)]">Changes</span>
        <span>{workProduct.filmstrip.length} current filmstrip slots · previous version unavailable</span>
        <span className="text-[var(--ink-3)]">Created</span>
        <span>{formatDateTime(workProduct.provenance.createdAt)}</span>
      </div>
      <div className="mt-3 border-t border-dashed border-[var(--line-soft)] pt-3">
        <SectionLabel>Release Notes</SectionLabel>
        <ComingSoonPanel className="mt-2" title="No release-note payload" body="Release notes and diff summaries are not exposed for WorkProduct versions yet." />
      </div>
    </Card>
  );
}

function PublishModeCard({ publishMode, setPublishMode }: { publishMode: PublishMode; setPublishMode: (mode: PublishMode) => void }) {
  const options: Array<{ key: PublishMode; title: string; description: string; icon: typeof Rocket }> = [
    { key: "release", title: "Release", description: "New numbered version. Publish action is disabled until API exists.", icon: Rocket },
    { key: "patch", title: "Patch", description: "Minor fix semantics. Local selection only.", icon: Save },
    { key: "preview", title: "Preview Only", description: "Shareable preview mode. Link generation is pending.", icon: Eye }
  ];
  return (
    <Card className="p-4" data-testid="publish-mode-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold">Publish Mode</h2>
        <Info size={12} color="var(--ink-4)" aria-hidden="true" />
      </div>
      <div className="grid gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = publishMode === option.key;
          return (
            <button
              key={option.key}
              type="button"
              className={`flex items-start gap-2 rounded-md border p-2 text-left ${selected ? "border-[var(--primary)] bg-[var(--primary-bg)]" : "border-[var(--line)]"}`}
              onClick={() => setPublishMode(option.key)}
              aria-pressed={selected}
            >
              <span className={`mt-0.5 grid h-4 w-4 place-items-center rounded-full border ${selected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--line-2)]"}`}>
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <Icon size={14} color={selected ? "var(--primary)" : "var(--ink-3)"} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{option.title}</span>
                <span className="mt-0.5 block text-[10.5px] text-[var(--ink-3)]">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

type ChecklistItem = {
  category: string;
  label: string;
  description: string;
  status: "ok" | "warn" | "pending";
  ai?: string;
};

function buildChecklist(workProduct: WorkProductVersionDetail): ChecklistItem[] {
  return [
    {
      category: "Content Integrity",
      label: "All slots have selected content units",
      description: `${workProduct.filmstrip.length} filmstrip slot${workProduct.filmstrip.length === 1 ? "" : "s"} returned`,
      status: workProduct.filmstrip.length > 0 ? "ok" : "warn"
    },
    { category: "Content Integrity", label: "No deprecated content units", description: "No structured pre-publish checklist endpoint", status: "pending" },
    { category: "Content Integrity", label: "No duplicate or conflicting slides", description: "Deck-level AI review is not exposed", status: "pending", ai: "AI review unavailable" },
    { category: "Content Integrity", label: "Freshness check", description: "Uses WorkProduct statusChips when present", status: statusChipsFor(workProduct).freshnessState === "stale" ? "warn" : "pending" },
    { category: "Brand & Rights", label: "Brand compliance", description: "Brand policy scan endpoint is not exposed", status: "pending" },
    { category: "Brand & Rights", label: "No external/unlicensed imagery", description: "Rights metadata is not exposed", status: "pending" },
    { category: "Brand & Rights", label: "Customer references have consent", description: "Consent records are not exposed", status: "pending" },
    { category: "Brand & Rights", label: "PII & sensitive data scan", description: "No preflight scan endpoint exists", status: "pending" },
    { category: "Narrative & Accessibility", label: "Narrative score >= 80", description: "Storyboard diagnostics are not scoped here", status: "pending" },
    { category: "Narrative & Accessibility", label: "Accessibility", description: "Accessibility validation endpoint is not exposed", status: "pending" }
  ];
}

function ApprovalChecklist({ checks, passedCount, warningCount }: { checks: ChecklistItem[]; passedCount: number; warningCount: number }) {
  const categories = Array.from(new Set(checks.map((check) => check.category)));
  return (
    <Card className="p-4" data-testid="approval-checklist">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[13px] font-bold">Approval Checklist</h2>
          <Badge kind={warningCount > 0 ? "warn" : "ok"}>{passedCount} of {checks.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--ink-3)]">{warningCount} warning(s); most checks pending API</span>
          <Button size="xs" type="button" disabled>
            <Sparkles size={11} color="var(--ai)" aria-hidden="true" /> Run Full AI Review
          </Button>
        </div>
      </div>
      <div className="grid gap-x-6 lg:grid-cols-2">
        {categories.map((category) => (
          <div key={category}>
            <SectionLabel>{category}</SectionLabel>
            {checks.filter((check) => check.category === category).map((check) => (
              <CheckRow key={check.label} item={check} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CheckRow({ item }: { item: ChecklistItem }) {
  const icon =
    item.status === "ok" ? (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--ok)] text-white">
        <Check size={11} aria-hidden="true" />
      </span>
    ) : item.status === "warn" ? (
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--warn)] text-xs font-bold text-white">!</span>
    ) : (
      <span className="h-[18px] w-[18px] rounded-full border border-[var(--line-2)] bg-[var(--bg-2)]" />
    );
  return (
    <div className="flex items-start gap-2 border-b border-dashed border-[var(--line-soft)] py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">{item.label}</div>
        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">{item.description}</div>
        {item.ai && <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[var(--ai)]"><Sparkles size={10} aria-hidden="true" /> {item.ai}</div>}
      </div>
      {item.status === "warn" && <Button size="xs" type="button" disabled>Fix</Button>}
    </div>
  );
}

function PackageOutputs() {
  return (
    <Card className="p-4" data-testid="package-outputs">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Package Outputs</h2>
        <span className="text-[11px] text-[var(--ink-3)]">0 of 6 active</span>
      </div>
      {packageOutputs.map((output) => {
        const Icon = output.icon;
        return (
          <div key={output.key} className="flex items-center gap-3 border-b border-dashed border-[var(--line-soft)] py-2.5 last:border-b-0">
            <input type="checkbox" disabled aria-label={`${output.title} output unavailable`} className="h-4 w-4" />
            <span className={`grid h-8 w-8 place-items-center rounded-md ${output.ai ? "bg-[var(--ai-bg)] text-[var(--ai)]" : "bg-[var(--bg-2)] text-[var(--ink-2)]"}`}>
              <Icon size={15} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold">
                {output.title}
                {output.ai && <Badge kind="ai">AI</Badge>}
              </div>
              <div className="text-[11px] text-[var(--ink-3)]">{output.description}</div>
            </div>
            <span className="text-[10.5px] text-[var(--ink-3)]">API pending</span>
          </div>
        );
      })}
      <ComingSoonPanel className="mt-3" title="No package output API" body="Output selection, sizes, generation metadata, and custom outputs are not persisted or generated yet." />
    </Card>
  );
}

function ProvenanceRights({ workProduct }: { workProduct: WorkProductVersionDetail }) {
  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Provenance & Rights</h2>
        <DataBadge tone="warn">Partial</DataBadge>
      </div>
      <SectionLabel>Composed from</SectionLabel>
      <div className="mt-2 grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Package size={13} color="var(--primary)" aria-hidden="true" />
          <span className="font-semibold">{workProduct.filmstrip.length} Content Units</span>
          <span className="ml-auto text-[var(--ink-3)]">filmstrip</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} color="var(--primary)" aria-hidden="true" />
          <span className="font-semibold">{workProduct.provenance.sourceRefs?.length ?? 0} Source refs</span>
          <span className="ml-auto text-[var(--ink-3)]">provenance</span>
        </div>
      </div>
      <SectionLabel>Customer & 3rd-party</SectionLabel>
      <ComingSoonPanel className="mt-2" title="Rights metadata unavailable" body="Consent, license, brand-template, and data-source rows are not exposed by the WorkProduct API." />
    </Card>
  );
}

function AudienceUseCase() {
  return (
    <Card className="p-4" data-testid="audience-use-case">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold">Audience & Use Case</h2>
        <Button size="xs" type="button" disabled>Edit</Button>
      </div>
      <EmptyInline title="Audience and opportunity links unavailable" body="Opportunity entities, WorkProduct audience tags, use-case tags, stage, and linked opportunity payloads are not exposed yet." />
    </Card>
  );
}

function AiRecommendations() {
  return (
    <Card className="p-4" data-testid="ai-package-recommendations">
      <div className="mb-2.5 flex items-center gap-2">
        <Sparkles size={14} color="var(--ai)" aria-hidden="true" />
        <h2 className="m-0 text-[13px] font-bold">AI Package Recommendations</h2>
        <Badge kind="ai">BETA</Badge>
      </div>
      <ComingSoonPanel title="No AI recommendation endpoint" body="Package recommendations, impact badges, and generated actions are not exposed for WorkProducts yet." />
    </Card>
  );
}

function DistributionPreview() {
  return (
    <Card className="p-4" data-testid="distribution-preview">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">Distribution (after publish)</h2>
        <Button size="xs" type="button" disabled><Plus size={11} aria-hidden="true" /> Add Channel</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { icon: Users, title: "Subscribers" },
          { icon: Target, title: "Opportunity" },
          { icon: Package, title: "Library" },
          { icon: Send, title: "Email Digest" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-md border border-[var(--line-soft)] bg-[var(--bg)] p-2 opacity-70">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Icon size={13} color="var(--ink-3)" aria-hidden="true" /> {item.title}
              </div>
              <div className="mt-1 text-[10.5px] text-[var(--ink-3)]">Channel API pending</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PublishRightRail({
  workProduct,
  statusChips,
  passedCount,
  warningCount
}: {
  workProduct: WorkProductVersionDetail;
  statusChips: ReturnType<typeof statusChipsFor>;
  passedCount: number;
  warningCount: number;
}) {
  return (
    <aside className="grid content-start gap-3 xl:sticky xl:top-4" data-testid="publish-right-rail">
      <RailCard title="Pre-flight Status" action={<Badge kind={warningCount > 0 ? "warn" : "ok"}>{warningCount} Warning</Badge>}>
        <div className="grid gap-1.5">
          <MiniStatusRow label="Checklist" value={`${passedCount}/10`} ok={warningCount === 0} />
          <MiniStatusRow label="Approvals" value={titleCase(workProduct.approvalState)} ok={workProduct.approvalState === "approved"} />
          <MiniStatusRow label="Brand & Rights" value="API pending" ok={false} />
          <MiniStatusRow label="Freshness" value={titleCase(statusChips.freshnessState ?? "unknown")} ok={statusChips.freshnessState === "fresh"} />
          <MiniStatusRow label="Accessibility" value="API pending" ok={false} />
        </div>
        <div className="mt-3 border-t border-dashed border-[var(--line-soft)] pt-3 text-xs">
          <div className="text-[var(--ink-3)]">Ready to publish?</div>
          <div className="mt-1 flex items-center gap-1 font-semibold text-[var(--warn)]">
            <AlertTriangle size={12} aria-hidden="true" /> No, package API is not available
          </div>
        </div>
      </RailCard>

      <RailCard title="Approval Routing" action={<button className="link text-[11px]" type="button" disabled>Edit</button>}>
        <div className="flex items-center gap-2 border-b border-dashed border-[var(--line-soft)] py-2">
          <Avatar who="Owner" className="sm" />
          <div className="min-w-0 flex-1 text-[11px]">
            <div className="font-semibold">Current approval state</div>
            <div className="text-[10.5px] text-[var(--ink-3)]">{titleCase(workProduct.approvalState)} · object state only</div>
          </div>
          <StatusBadge tone={approvalTone(workProduct.approvalState)}>{titleCase(workProduct.approvalState)}</StatusBadge>
        </div>
        <ComingSoonPanel className="mt-2" title="No approval-routing API" body="Named approvers, roles, timestamps, and not-required states are not exposed." />
      </RailCard>

      <RailCard title="Publish Settings">
        <div className="grid gap-3 text-[11.5px]">
          <label className="grid gap-1">
            <span className="text-[var(--ink-3)]">Access</span>
            <select className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5" disabled>
              <option>Organization - all members</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[var(--ink-3)]">Expires</span>
            <select className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5" disabled>
              <option>No expiration</option>
            </select>
          </label>
          {["Notify subscribers on publish", "Auto-retire previous version", "Lock variants from editing", "Track views & engagement"].map((label) => (
            <label key={label} className="flex items-center gap-2 text-[11.5px] text-[var(--ink-3)]">
              <input type="checkbox" disabled /> {label}
            </label>
          ))}
        </div>
      </RailCard>

      <RailCard title="Recent Activity">
        <div className="flex items-start gap-2 py-1 text-[11px]">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--bg-2)] text-[var(--primary)]">
            <Info size={11} aria-hidden="true" />
          </span>
          <div>
            <div>
              <b>Provenance</b> created for this version
            </div>
            <div className="text-[10.5px] text-[var(--ink-3)]">{formatDateTime(workProduct.provenance.createdAt)}</div>
          </div>
        </div>
        <ComingSoonPanel className="mt-2" title="Object activity API unavailable" body="Comments, notes, and admin audit events are separate; no publish-scoped activity feed exists." />
      </RailCard>
    </aside>
  );
}
