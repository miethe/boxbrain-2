import { Card } from "@/components/ui";
import type { Note } from "@/lib/api";
import { NotesList, AddNoteForm } from "./notes-panel";

export function NotesTab({
  pageId,
  versionId,
  notes,
  createNoteAction
}: {
  pageId: string;
  versionId?: string;
  notes: Note[];
  createNoteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Card className="mt-5 p-4">
      <NotesList notes={notes} />
      {versionId && <AddNoteForm pageId={pageId} versionId={versionId} createNoteAction={createNoteAction} />}
    </Card>
  );
}
