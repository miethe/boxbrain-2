import clsx from "clsx";
import { AlertTriangle, Check, Info, Lock } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Badge, Card, SlideThumb } from "@/components/ui";
import { clampPercent, type ThumbVariant, type Tone } from "@/features/work-products/lib";

export function DeckThumb({
  title,
  brand = "BB",
  variant = "dark",
  active = false,
  uri,
  apiBaseUrl,
  className,
  compact = false
}: {
  title: string;
  brand?: string;
  variant?: ThumbVariant;
  active?: boolean;
  uri?: string | null;
  apiBaseUrl?: string;
  className?: string;
  compact?: boolean;
}) {
  const style = uri
    ? ({
        backgroundImage: `url("${assetUrl(uri, apiBaseUrl)}")`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      } as CSSProperties)
    : undefined;

  if (uri) {
    return (
      <div
        className={clsx("slide-thumb light bg-cover bg-center", active && "ring-2 ring-[var(--primary)] ring-offset-2", className)}
        role="img"
        aria-label={`${title} preview`}
        style={style}
      >
        <div className="slide-content bg-white/75">
          <div className="slide-brand">{brand}</div>
          <div className="slide-title">{title}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx("rounded-[var(--radius-sm)]", active && "ring-2 ring-[var(--primary)] ring-offset-2", className)}
    >
      <SlideThumb title={title} brand={brand} variant={variant} chart={!compact} />
    </div>
  );
}

export function ComingSoonPanel({
  title,
  body,
  icon = "info",
  className
}: {
  title: string;
  body: string;
  icon?: "info" | "warn" | "lock";
  className?: string;
}) {
  const Icon = icon === "warn" ? AlertTriangle : icon === "lock" ? Lock : Info;
  const toneClass = icon === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-2)]";
  return (
    <div className={clsx("rounded-lg border p-3 text-sm", toneClass, className)}>
      <div className="flex items-start gap-2">
        <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="m-0 mt-1 text-xs leading-5 opacity-80">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyInline({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line-2)] p-4 text-sm text-[var(--ink-3)]">
      <div className="font-semibold text-[var(--ink-2)]">{title}</div>
      <p className="m-0 mt-1 text-xs leading-5">{body}</p>
    </div>
  );
}

export function MetricTile({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: Tone }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--paper)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-3)]">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight text-[var(--ink)]">{value}</div>
      {hint && <div className={clsx("mt-1 text-[10px] font-semibold", toneTextClass(tone))}>{hint}</div>}
    </div>
  );
}

export function DonutGauge({ value, label, tone = "ok" }: { value: number; label?: string; tone?: Tone }) {
  const score = clampPercent(value);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${label ?? "Score"} ${score}%`}>
      <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--bg-2)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={toneCssVar(tone)}
        strokeLinecap="round"
        strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">
        {score}
      </text>
    </svg>
  );
}

export function BarSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox={`0 0 ${values.length * 14} 56`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
      {values.map((value, index) => {
        const height = Math.max(4, (value / max) * 50);
        return <rect key={index} x={index * 14 + 2} y={54 - height} width="10" height={height} rx="2" fill="var(--primary)" opacity={index % 4 === 0 ? 0.95 : 0.55} />;
      })}
    </svg>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-[var(--ink-3)]">{children}</div>;
}

export function MiniStatusRow({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className={clsx("flex items-center gap-2 text-[11.5px]", !ok && "text-[var(--warn)]")}>
      <span className={clsx("grid h-4 w-4 place-items-center rounded-full", ok ? "bg-[var(--ok)] text-white" : "bg-[var(--warn)] text-white")}>
        {ok ? <Check size={10} aria-hidden="true" /> : "!"}
      </span>
      <span>{label}</span>
      <span className="ml-auto text-[10.5px] text-[var(--ink-3)]">{value}</span>
    </div>
  );
}

export function RailCard({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={clsx("p-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold text-[var(--ink)]">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function DataBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <Badge kind={tone === "danger" ? "danger" : tone === "warn" ? "warn" : tone === "ok" ? "ok" : tone === "ai" ? "ai" : tone === "primary" ? "primary" : "neutral"}>{children}</Badge>;
}

function toneTextClass(tone: Tone) {
  if (tone === "ok") return "text-[var(--ok)]";
  if (tone === "warn") return "text-[var(--warn)]";
  if (tone === "danger") return "text-[var(--danger)]";
  if (tone === "ai") return "text-[var(--ai)]";
  if (tone === "primary") return "text-[var(--primary)]";
  return "text-[var(--ink-3)]";
}

function toneCssVar(tone: Tone) {
  if (tone === "warn") return "var(--warn)";
  if (tone === "danger") return "var(--danger)";
  if (tone === "ai") return "var(--ai)";
  if (tone === "primary") return "var(--primary)";
  return "var(--ok)";
}

function assetUrl(uri: string, apiBaseUrl?: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  if (!apiBaseUrl) return uri;
  return `${apiBaseUrl}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
