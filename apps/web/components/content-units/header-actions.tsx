"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, Copy, Layers, MoreHorizontal, Network, Share2 } from "lucide-react";
import Link from "next/link";
import { useMySelection } from "@/components/selection";
import type { Storyboard } from "@/lib/api";

export function HeaderActions({
  pageId,
  versionId,
  title,
  subtitle,
  thumb,
  storyboards,
  addToStoryboardAction
}: {
  pageId: string;
  versionId?: string;
  title: string;
  subtitle?: string;
  thumb?: string | null;
  storyboards: Storyboard[];
  addToStoryboardAction: (formData: FormData) => void | Promise<void>;
}) {
  const { toggle, has } = useMySelection();
  const inCollection = has(pageId);

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn btn-sm" disabled title="Sharing links aren't available yet">
        <Share2 size={14} aria-hidden="true" /> Share
      </button>
      <button
        type="button"
        className="btn btn-sm"
        aria-pressed={inCollection}
        onClick={() => toggle({ id: pageId, type: "contentunit", title, subtitle, thumb: thumb ?? undefined })}
      >
        {inCollection ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
        {inCollection ? "In Collection" : "Add to Collection"}
      </button>
      {versionId ? (
        <AddToDeckMenu storyboards={storyboards} versionId={versionId} title={title} addToStoryboardAction={addToStoryboardAction} />
      ) : (
        <button type="button" className="btn btn-primary btn-sm" disabled title="No version is selected yet">
          <Layers size={14} aria-hidden="true" /> Add to Deck
        </button>
      )}
      <MoreMenu contentUnitId={pageId} />
    </div>
  );
}

function AddToDeckMenu({
  storyboards,
  versionId,
  title,
  addToStoryboardAction
}: {
  storyboards: Storyboard[];
  versionId: string;
  title: string;
  addToStoryboardAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(storyboards.length === 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" className="btn btn-primary btn-sm" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
        <Layers size={14} aria-hidden="true" /> Add to Deck
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div className="card absolute right-0 top-[calc(100%+6px)] z-20 w-72 p-3 shadow-[var(--shadow-lg)]">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-3)]">Add to storyboard</div>
          <form action={addToStoryboardAction} className="grid gap-2">
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="title" value={title} />
            {storyboards.length > 0 && !creatingNew ? (
              <>
                <select name="storyboardId" className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm">
                  {storyboards.map((storyboard) => (
                    <option key={storyboard.id} value={storyboard.id}>
                      {storyboard.title}
                    </option>
                  ))}
                </select>
                <button type="button" className="link justify-self-start text-xs" onClick={() => setCreatingNew(true)}>
                  + Create a new storyboard instead
                </button>
              </>
            ) : (
              <>
                <input type="hidden" name="storyboardId" value="__new__" />
                <input name="newStoryboardTitle" required className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm" placeholder="New storyboard title" defaultValue={`${title} storyboard`} />
                {storyboards.length > 0 && (
                  <button type="button" className="link justify-self-start text-xs" onClick={() => setCreatingNew(false)}>
                    Use an existing storyboard instead
                  </button>
                )}
              </>
            )}
            <button type="submit" className="btn btn-primary btn-sm justify-center">
              Add & open storyboard
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MoreMenu({ contentUnitId }: { contentUnitId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(contentUnitId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; fail silently rather than throw.
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" className="icon-btn" aria-label="More actions" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="card absolute right-0 top-[calc(100%+6px)] z-20 w-52 p-1.5 shadow-[var(--shadow-lg)]" role="menu">
          <Link href="/variation-explorer" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--bg-2)]" role="menuitem">
            <Network size={13} aria-hidden="true" /> Open Variation Explorer
          </Link>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--bg-2)]" role="menuitem" onClick={copyId}>
            <Copy size={13} aria-hidden="true" /> {copied ? "Copied!" : "Copy ContentUnit ID"}
          </button>
        </div>
      )}
    </div>
  );
}
