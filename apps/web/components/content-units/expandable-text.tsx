/** Zero-JS "Show more / Show less" using a native <details> + Tailwind's group-open variant. */
export function ExpandableText({ text, limit = 220 }: { text: string; limit?: number }) {
  if (text.length <= limit) return <div className="text-sm leading-relaxed text-[var(--ink-2)]">{text}</div>;
  const head = text.slice(0, limit).trimEnd();
  const tail = text.slice(limit);
  return (
    <details className="group text-sm leading-relaxed text-[var(--ink-2)]">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">
          {head}… <span className="link">Show more</span>
        </span>
        <span className="hidden group-open:inline">
          {head}
          {tail} <span className="link">Show less</span>
        </span>
      </summary>
    </details>
  );
}
