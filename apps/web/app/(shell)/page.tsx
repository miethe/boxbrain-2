import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  Flag,
  Library,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { ApiError, boxbrainApi, type ContentUnitFamilyCard, type IngestionJob, type ReviewItem, type ReviewQueueSummary } from "@/lib/api";
import { Card, EmptyState, SectionHead, SlideThumb, Stat, StatusBadge, Tag } from "@/components/ui";
import { approvalTone, formatDate, slideThumbVariant } from "@/features/library/format";
import {
  buildAiSuggestions,
  buildAttentionFeed,
  familyBreakdown,
  formatBriefingDate,
  greetingForHour,
  summarizeIngestionJobs,
  type AttentionIconKey,
  type AttentionItem
} from "@/features/home/lib";
import { getPlayCategoryCounts } from "@/features/plays/data";

type SourceState<T> = { status: "ok"; data: T } | { status: "restricted" } | { status: "error"; message: string };

async function loadReviews(): Promise<SourceState<{ queues: ReviewQueueSummary[]; items: ReviewItem[] }>> {
  try {
    const [queues, itemsPage] = await Promise.all([boxbrainApi.listReviewQueues(), boxbrainApi.listReviewItems({ status: "open", limit: 5 })]);
    return { status: "ok", data: { queues, items: itemsPage.items } };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    return { status: "error", message: error instanceof Error ? error.message : "Review queues could not be loaded." };
  }
}

async function loadFamilies(): Promise<SourceState<ContentUnitFamilyCard[]>> {
  try {
    const page = await boxbrainApi.listContentUnitFamilies({ limit: 200, mode: "families" });
    return { status: "ok", data: page.items };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    return { status: "error", message: error instanceof Error ? error.message : "Content families could not be loaded." };
  }
}

async function loadIngestion(): Promise<SourceState<IngestionJob[]>> {
  try {
    const result = await boxbrainApi.listIngestionJobs();
    return { status: "ok", data: result.items };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return { status: "restricted" };
    return { status: "error", message: error instanceof Error ? error.message : "Ingestion jobs could not be loaded." };
  }
}

const attentionIcons: Record<AttentionIconKey, typeof Flag> = {
  flag: Flag,
  clock: Clock,
  sparkle: Sparkles,
  shield: ShieldAlert
};

const attentionToneColor: Record<AttentionItem["tone"], string> = {
  danger: "var(--danger)",
  warn: "var(--warn)",
  ai: "var(--ai)",
  primary: "var(--primary)"
};

export default async function HomePage() {
  const [reviews, families, ingestion] = await Promise.all([loadReviews(), loadFamilies(), loadIngestion()]);

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatBriefingDate(now);

  const reviewsOk = reviews.status === "ok";
  const familiesOk = families.status === "ok";
  const ingestionOk = ingestion.status === "ok";

  const familyStats = familiesOk ? familyBreakdown(families.data) : null;
  const openReviewCount = reviewsOk ? reviews.data.queues.reduce((total, queue) => total + queue.openCount, 0) : 0;
  const ingestionSummary = ingestionOk ? summarizeIngestionJobs(ingestion.data) : null;
  const playCounts = getPlayCategoryCounts();

  const attentionItems = buildAttentionFeed({
    reviewsAvailable: reviewsOk,
    reviewItems: reviewsOk ? reviews.data.items : [],
    ingestionAvailable: ingestionOk,
    ingestionJobs: ingestionOk ? ingestion.data : [],
    familiesAvailable: familiesOk,
    staleFamilyCount: familyStats?.stale ?? 0
  });

  const aiSuggestions = buildAiSuggestions({
    reviewsAvailable: reviewsOk,
    queues: reviewsOk ? reviews.data.queues : [],
    familiesAvailable: familiesOk,
    staleFamilyCount: familyStats?.stale ?? 0,
    restrictedFamilyCount: familyStats?.restricted ?? 0
  });

  return (
    <div className="route-body" data-testid="home-page">
      <div className="mb-6" data-testid="home-greeting">
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-slate-950">{greeting}</h1>
        <p className="mt-1 text-sm text-slate-500">Here&rsquo;s what&rsquo;s moving across your content graph today — {dateLabel}.</p>
      </div>

      <div className="grid-auto mb-5" data-testid="home-stats">
        <Stat
          label="Content families"
          value={familiesOk ? String(familyStats?.total ?? 0) : "—"}
          hint={familiesOk ? `${familyStats?.approved ?? 0} approved · ${familyStats?.stale ?? 0} stale` : sourceHint(families.status)}
        />
        <Stat
          label="Pending reviews"
          value={reviewsOk ? String(openReviewCount) : "—"}
          hint={reviewsOk ? `${reviews.data.queues.length} open queue${reviews.data.queues.length === 1 ? "" : "s"}` : sourceHint(reviews.status)}
        />
        <Stat
          label="Ingestion activity"
          value={ingestionOk ? String((ingestionSummary?.running ?? 0) + (ingestionSummary?.queued ?? 0)) : "—"}
          hint={ingestionOk ? `${ingestionSummary?.failed ?? 0} failed · ${ingestionSummary?.complete ?? 0} complete` : sourceHint(ingestion.status)}
        />
        <Stat label="Plays &amp; Opportunities" value={`${playCounts.all} plays`} hint="1 preview opportunity · seed data, not live analytics" />
      </div>

      <div className="two-col" data-testid="home-attention-row">
        <Card className="p-4" data-testid="home-attention">
          <SectionHead action={<Link className="text-xs font-semibold text-[var(--primary)]" href="/reviews">View all</Link>}>Needs your attention</SectionHead>
          {attentionItems.length === 0 ? (
            <EmptyState title="Nothing needs attention" body="No open review items, ingestion issues, or stale content were found." />
          ) : (
            <div className="flex flex-col">
              {attentionItems.map((item, index) => {
                const Icon = attentionIcons[item.iconKey];
                const color = attentionToneColor[item.tone];
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`-mx-1 flex items-start gap-3 rounded-md px-1 py-3 hover:bg-slate-50 ${index < attentionItems.length - 1 ? "border-b border-dashed border-slate-200" : ""}`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `color-mix(in oklab, ${color} 14%, white)`, color }}
                      aria-hidden="true"
                    >
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.subtitle}</span>
                    </span>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-slate-300" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <div className="ai-panel" data-testid="home-ai-suggests">
          <h4>
            <Sparkles size={14} aria-hidden="true" /> BoxBrain suggests
            <span className="beta">BETA</span>
          </h4>
          <div className="ai-body">Candidate next actions computed from your live review queues and catalog freshness — review before acting.</div>
          <div className="mt-3 flex flex-col gap-2">
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-start gap-2 rounded-[10px] border border-[var(--ai-border)] bg-white px-2.5 py-2 text-xs">
                <Sparkles size={12} color="var(--ai)" className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[var(--ink-2)]">{suggestion.text}</span>
                <Link href={suggestion.href} className="btn btn-ghost btn-xs ml-auto whitespace-nowrap">
                  Take action
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-auto mt-5" data-testid="home-quick-links">
        <Link href="/ask" className="card card-hoverable flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: "var(--bg-2)" }}>
            <Sparkles size={16} color="var(--ai)" aria-hidden="true" />
          </span>
          <b className="text-sm">Ask BoxBrain</b>
          <ArrowRight size={14} color="var(--ink-4)" className="ml-auto" aria-hidden="true" />
        </Link>
        <Link href="/library" className="card card-hoverable flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: "var(--bg-2)" }}>
            <Library size={16} color="var(--primary)" aria-hidden="true" />
          </span>
          <b className="text-sm">Browse Library</b>
          <ArrowRight size={14} color="var(--ink-4)" className="ml-auto" aria-hidden="true" />
        </Link>
        <Link href="/plays" className="card card-hoverable flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: "var(--bg-2)" }}>
            <Rocket size={16} color="var(--ok)" aria-hidden="true" />
          </span>
          <b className="text-sm">Open Plays</b>
          <ArrowRight size={14} color="var(--ink-4)" className="ml-auto" aria-hidden="true" />
        </Link>
        <Link href="/opportunities" className="card card-hoverable flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: "var(--bg-2)" }}>
            <Building2 size={16} color="var(--warn)" aria-hidden="true" />
          </span>
          <b className="text-sm">My Opportunities</b>
          <ArrowRight size={14} color="var(--ink-4)" className="ml-auto" aria-hidden="true" />
        </Link>
      </div>

      <div className="two-col mt-5">
        <Card className="p-4" data-testid="home-ingestion-activity">
          <SectionHead action={<Link className="text-xs font-semibold text-[var(--primary)]" href="/ingestion">Open ingestion</Link>}>Recent ingestion activity</SectionHead>
          <IngestionActivity ingestion={ingestion} />
        </Card>

        <Card className="p-4" data-testid="home-family-highlights">
          <SectionHead action={<Link className="text-xs font-semibold text-[var(--primary)]" href="/library">Browse library</Link>}>Family highlights</SectionHead>
          <FamilyHighlights families={families} />
        </Card>
      </div>
    </div>
  );
}

function sourceHint(status: "restricted" | "error") {
  return status === "restricted" ? "Requires elevated access" : "Temporarily unavailable";
}

function IngestionActivity({ ingestion }: { ingestion: SourceState<IngestionJob[]> }) {
  if (ingestion.status === "restricted") {
    return <EmptyState title="Restricted" body="The current role cannot view ingestion job telemetry." />;
  }
  if (ingestion.status === "error") {
    return <EmptyState title="Ingestion activity unavailable" body={ingestion.message} />;
  }
  if (ingestion.data.length === 0) {
    return <EmptyState title="No ingestion jobs yet" body="Uploaded decks and their pipeline status will appear here." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {ingestion.data.slice(0, 4).map((job) => (
        <div key={job.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: job.status === "failed" ? "var(--danger-bg)" : job.status === "complete" ? "var(--ok-bg)" : "var(--primary-bg)",
              color: job.status === "failed" ? "var(--danger)" : job.status === "complete" ? "var(--ok)" : "var(--primary)"
            }}
          >
            {job.status === "failed" ? <AlertTriangle size={14} /> : job.status === "complete" ? <ShieldCheck size={14} /> : <Clock size={14} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{job.title ?? job.artifactType}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {job.stage} · {formatDate(job.createdAt) ?? "Unknown date"}
            </div>
          </div>
          <StatusBadge tone={job.status === "failed" ? "danger" : job.status === "complete" ? "ok" : job.status === "running" ? "primary" : "neutral"}>{job.status}</StatusBadge>
        </div>
      ))}
    </div>
  );
}

function FamilyHighlights({ families }: { families: SourceState<ContentUnitFamilyCard[]> }) {
  if (families.status === "restricted") {
    return <EmptyState title="Restricted" body="The current role cannot view the content catalog." />;
  }
  if (families.status === "error") {
    return <EmptyState title="Family highlights unavailable" body={families.message} />;
  }
  if (families.data.length === 0) {
    return <EmptyState title="No content families yet" body="Ingested decks will surface here once families are formed." />;
  }
  const highlights = [...families.data].sort((left, right) => (right.versionCount ?? 0) - (left.versionCount ?? 0)).slice(0, 3);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {highlights.map((family) => (
        <Link key={family.id} href={`/content-units/${family.id}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
          <SlideThumb title={family.familyTitle} variant={slideThumbVariant(family.id)} sub={family.unitType} />
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm font-bold text-slate-900">{family.familyTitle}</div>
              {family.statusChips && <StatusBadge tone={approvalTone(family.statusChips.approvalState)}>{family.statusChips.approvalState}</StatusBadge>}
            </div>
            {family.conceptualSummary && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{family.conceptualSummary}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag size="sm">{family.variantCount ?? 0} variants</Tag>
              <Tag size="sm">{family.versionCount ?? 0} versions</Tag>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
