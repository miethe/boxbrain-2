import Link from "next/link";
import { BookOpen, FolderKanban } from "lucide-react";
import { Card } from "@/components/ui";

export function PlaysPreviewPanel() {
  return (
    <Card className="p-6 text-center" data-testid="library-plays-preview">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-[var(--bg-2)] text-[var(--ink-3)]">
        <BookOpen size={20} aria-hidden="true" />
      </div>
      <div className="text-sm font-bold text-[var(--ink)]">Plays are not a governed Library object yet</div>
      <p className="mx-auto mt-1.5 max-w-lg text-sm text-[var(--ink-3)]">
        There is no Play domain model or API in BoxBrain v2 yet — Plays currently live only as a preview-only seeded list on the Plays page, unconnected to the
        ContentUnit graph. This tab intentionally stays empty rather than fabricating governed play cards.
      </p>
      <Link href="/plays" className="btn btn-sm mt-4 inline-flex">
        Browse the Plays preview
      </Link>
    </Card>
  );
}

export function CollectionsPreviewPanel() {
  return (
    <Card className="p-6 text-center" data-testid="library-collections-preview">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-[var(--bg-2)] text-[var(--ink-3)]">
        <FolderKanban size={20} aria-hidden="true" />
      </div>
      <div className="text-sm font-bold text-[var(--ink)]">Collections have no backend yet</div>
      <p className="mx-auto mt-1.5 max-w-lg text-sm text-[var(--ink-3)]">
        No Collection domain model, route, or nav destination exists anywhere in BoxBrain v2. Saved-search collections shown in the design mockups are not
        implemented, so this tab is left as an honest empty state instead of a fabricated list.
      </p>
    </Card>
  );
}
