import clsx from "clsx";
import { Check, ChevronDown, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentType, CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "ai" | "primary" | "neutral";
type BadgeKind = Tone;
type ButtonSize = "default" | "sm" | "xs";
type MeterKind = "mid" | "low" | "ai";
type InfoTone = "primary" | "warn" | "danger" | "ai";

function toneClass(tone?: Tone) {
  return tone && tone !== "neutral" ? tone : tone === "neutral" ? "neutral" : undefined;
}

function sizeClass(size?: ButtonSize) {
  if (size === "sm") return "btn-sm";
  if (size === "xs") return "btn-xs";
  return undefined;
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function initialsFor(who: string) {
  const initials = who
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "U";
}

function avatarColorFor(who: string) {
  const colors = ["violet", "teal", "amber", "green", ""];
  const hash = Array.from(who || "U").reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function Button({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost"; size?: ButtonSize }) {
  return (
    <button className={clsx("btn", variant === "primary" && "btn-primary", variant === "ghost" && "btn-ghost", sizeClass(size), className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={clsx("card", className)} {...props}>
      {children}
    </section>
  );
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

export function Badge({ kind = "neutral", dot = false, children }: { kind?: BadgeKind; dot?: boolean; children: ReactNode }) {
  return (
    <span className={clsx("badge", toneClass(kind))}>
      {dot && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function BadgeCheck({ children }: { children: ReactNode }) {
  return (
    <span className="badge-check">
      <Check size={13} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Chip({
  active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={clsx("chip", active && "active", className)} aria-pressed={active} {...props}>
      {children}
    </button>
  );
}

export function SplitButton({
  children,
  onMenu,
  size = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { onMenu: () => void; size?: ButtonSize; children: ReactNode }) {
  return (
    <span className={clsx("btn-split", className)}>
      <button className={clsx("btn btn-primary", sizeClass(size))} type="button" {...props}>
        {children}
      </button>
      <button className={clsx("btn btn-primary", sizeClass(size))} type="button" onClick={onMenu} aria-label="Open menu">
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

export function Tag({ children, tone = "neutral", size }: { children: ReactNode; tone?: Tone | "blue"; size?: "sm" }) {
  return <span className={clsx("tag", tone !== "neutral" && tone, tone === "neutral" && "neutral", size)}>{children}</span>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={clsx("badge", toneClass(tone))}>
      {tone === "ai" ? <Sparkles size={12} aria-hidden="true" /> : tone === "ok" ? <Check size={12} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function SlideThumb({
  title,
  brand = "ACME",
  variant = "dark",
  chart = true,
  sub,
  big = false,
  className
}: {
  title: string;
  brand?: string;
  variant?: "dark" | "light" | "teal" | "purple";
  chart?: boolean;
  sub?: string;
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("slide-thumb", variant, big && "big", className)} role="img" aria-label={`${title} preview`}>
      <div className="content slide-content">
        <div className="brand slide-brand">{brand}</div>
        <div className="title slide-title">{title}</div>
        {sub && <div className="sub slide-sub">{sub}</div>}
      </div>
      {chart && (
        <svg viewBox="0 0 100 40" aria-hidden="true" className="absolute bottom-[10%] right-[8%] h-[35%] w-[45%] opacity-85">
          {[20, 25, 30, 35, 28, 32, 38].map((height, index) => (
            <rect key={index} x={index * 13} y={40 - height} width="10" height={height} rx="1" fill="currentColor" opacity="0.55" />
          ))}
        </svg>
      )}
    </div>
  );
}

export function ScorePill({ value, label = "match" }: { value: number; label?: string }) {
  const score = clampPercent(value);
  const tone = score >= 85 ? "good" : score >= 70 ? "mid" : "low";
  return (
    <span className={clsx("score-pill", tone)}>
      <span className="circle">{score}</span>
      {label}
    </span>
  );
}

export function Meter({ value, label, kind }: { value: number; label?: string; kind?: MeterKind }) {
  const score = clampPercent(value);
  return (
    <div className="flex items-center gap-3">
      <div className={clsx("meter", kind)} style={{ "--v": score } as CSSProperties} aria-label={`${score}%`}>
        <span>{score}</span>
      </div>
      {label && <div className="text-sm font-semibold text-slate-700">{label}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  spark,
  up = false,
  down = false
}: {
  label: string;
  value: string;
  hint?: string;
  spark?: string;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
      {spark && (
        <div className="spark">
          <svg className="spark-svg" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
            <path className={clsx("line", up && "up", down && "down")} d={spark} />
          </svg>
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className
}: {
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}) {
  return (
    <Card className={clsx("stat-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label">{label}</div>
          <div className="value">{value}</div>
          <div className="hint">{hint}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <Icon size={17} aria-hidden={true} />
        </div>
      </div>
    </Card>
  );
}

export function MatchBar({ value }: { value: number }) {
  const score = clampPercent(value);
  return (
    <span className="match-bar" aria-label={`${score}% match`}>
      <span className="bar" style={{ "--v": score } as CSSProperties} aria-hidden="true" />
      <span>{score}%</span>
    </span>
  );
}

export function Stars({ n = 5, of = 5 }: { n?: number; of?: number }) {
  const total = Math.max(0, of);
  const filled = Math.max(0, Math.min(n, total));
  return (
    <span className="stars" aria-label={`${filled} of ${total} stars`}>
      {Array.from({ length: total }, (_, index) => (
        <Star key={index} size={12} className={index >= filled ? "off" : undefined} fill={index < filled ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </span>
  );
}

export function Avatar({ who, className }: { who: string; className?: string }) {
  const color = avatarColorFor(who);
  return <span className={clsx("avatar", color, className)}>{initialsFor(who)}</span>;
}

export function AvatarStack({ people, max = 4 }: { people: string[]; max?: number }) {
  const visible = people.slice(0, max);
  const hidden = Math.max(0, people.length - visible.length);
  return (
    <span className="avatar-stack" aria-label={people.join(", ")}>
      {visible.map((person) => (
        <Avatar key={person} who={person} />
      ))}
      {hidden > 0 && <span className="more">+{hidden}</span>}
    </span>
  );
}

export function SectionHead({ children, count, action }: { children: ReactNode; count?: number | string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3>{children}</h3>
      {count !== undefined && <span className="count-inline">{count}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function InfoBanner({ tone = "primary", children }: { tone?: InfoTone; children: ReactNode }) {
  return <div className={clsx("info-banner", tone !== "primary" && tone)}>{children}</div>;
}

export function Tabs({
  tabs,
  active,
  onChange
}: {
  tabs: Array<{ id: string; label: ReactNode; count?: number | string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = tabs.length - 1;
    const nextIndex =
      event.key === "Home" ? 0 : event.key === "End" ? lastIndex : event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].id);
  }

  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={clsx("tab", selected && "active")}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="count-inline">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ListRowContents({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-slate-500">{sub}</span>}
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </>
  );
}

export function ListRow({
  title,
  sub,
  right,
  onClick,
  href,
  className
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const classes = clsx("list-row", className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        <ListRowContents title={title} sub={sub} right={right} />
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        <ListRowContents title={title} sub={sub} right={right} />
      </button>
    );
  }
  return (
    <div className={classes}>
      <ListRowContents title={title} sub={sub} right={right} />
    </div>
  );
}

export function IconButton({
  label,
  borderless = false,
  children,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & { label: string; borderless?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={clsx("icon-btn", borderless && "borderless", className)} aria-label={label} {...props}>
      {children}
    </button>
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
