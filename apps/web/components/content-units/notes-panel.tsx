import Link from "next/link";
import { Bookmark, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui";
import type { Note } from "@/lib/api";
import { formatDate } from "@/features/content-units/lib";

const noteTypeOptions = ["usage_guidance", "review_note", "migration_note"];

export function NotesList({ notes, limit, viewAllHref }: { notes: Note[]; limit?: number; viewAllHref?: string }) {
  const visible = limit ? notes.slice(0, limit) : notes;
  return (
    <div>
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line-2)] p-3 text-sm text-[var(--ink-3)]">No notes recorded yet.</div>
      ) : (
        visible.map((note, index) => (
          <div key={note.id} className={`flex items-start gap-2 py-2 ${index < visible.length - 1 ? "border-b border-dashed border-[var(--line-soft)]" : ""}`}>
            <Bookmark size={14} color="var(--warn)" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-medium text-[var(--ink)]">{note.title ?? note.body}</div>
              {note.title && <div className="mt-0.5 text-[var(--ink-2)]">{note.body}</div>}
              <div className="muted mt-1 text-[11px]">
                {formatDate(note.createdAt)}
                {note.isPinned ? " · pinned" : ""}
              </div>
            </div>
          </div>
        ))
      )}
      {viewAllHref && notes.length > (limit ?? 0) && (
        <Link className="link mt-2 inline-block text-xs" href={viewAllHref}>
          View all ({notes.length})
        </Link>
      )}
    </div>
  );
}

export function AddNoteForm({
  pageId,
  versionId,
  createNoteAction
}: {
  pageId: string;
  versionId: string;
  createNoteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={createNoteAction} className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] p-3">
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input name="title" className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note title (optional)" />
      <textarea name="body" required rows={2} className="min-h-16 rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="Note body" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <select name="noteType" defaultValue="usage_guidance" className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-semibold text-[var(--ink-2)]">
          {noteTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs font-semibold text-[var(--ink-2)]">
          <input type="checkbox" name="isPinned" className="h-4 w-4 rounded border-[var(--line-2)]" />
          Pin
        </label>
      </div>
      <Button type="submit" className="justify-center">
        <NotebookPen size={14} /> Add note
      </Button>
    </form>
  );
}
