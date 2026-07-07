export function TextPanel({ title, body, empty }: { title: string; body?: string | null; empty: string }) {
  return (
    <div className="rounded-lg bg-[var(--bg-2)] p-3">
      <div className="mb-1 text-xs font-bold uppercase text-[var(--ink-3)]">{title}</div>
      <div className="text-sm text-[var(--ink-2)]">{body?.trim() || empty}</div>
    </div>
  );
}
