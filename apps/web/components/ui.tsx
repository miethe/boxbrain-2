import clsx from "clsx";
import { Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "ai" | "neutral";

export function Button({
  children,
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  return (
    <button className={clsx("btn", variant === "primary" && "btn-primary", variant === "ghost" && "btn-ghost", className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("card", className)}>{children}</section>;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{eyebrow}</div>}
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={clsx("tag", tone !== "neutral" && tone)}>{children}</span>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={clsx("badge", tone !== "neutral" && tone)}>
      {tone === "ai" ? <Sparkles size={12} /> : tone === "ok" ? <Check size={12} /> : null}
      {children}
    </span>
  );
}

export function SlideThumb({
  title,
  brand = "ACME",
  variant = "dark",
  chart = true
}: {
  title: string;
  brand?: string;
  variant?: "dark" | "light" | "teal" | "purple";
  chart?: boolean;
}) {
  return (
    <div className={clsx("slide-thumb", variant !== "dark" && variant)} aria-label={`${title} preview`}>
      <div className="slide-content">
        <div className="slide-brand">{brand}</div>
        <div className="slide-title">{title}</div>
      </div>
      {chart && (
        <svg viewBox="0 0 100 44" aria-hidden="true" className="absolute bottom-[9%] right-[7%] h-[36%] w-[46%] opacity-80">
          {[18, 24, 28, 36, 31, 38, 42].map((height, index) => (
            <rect key={index} x={index * 13} y={44 - height} width="9" height={height} rx="1.5" fill="currentColor" opacity="0.45" />
          ))}
        </svg>
      )}
    </div>
  );
}

export function ScorePill({ value, label = "match" }: { value: number; label?: string }) {
  const tone = value >= 88 ? "ok" : value >= 75 ? "warn" : "danger";
  return (
    <span className={clsx("score-pill", tone)}>
      <span>{value}</span>
      {label}
    </span>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-xs font-black"
        style={{
          background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--line) 0deg)`,
          color: "var(--primary)"
        }}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white">{value}</span>
      </div>
      {label && <div className="text-sm font-semibold text-slate-700">{label}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <Icon size={17} />
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-6 text-center">
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{body}</p>
    </Card>
  );
}
