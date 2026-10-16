"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Note } from "@/types";
import { requestJSON } from "@/lib/client-api";
import { stableWikiLink } from "@/lib/wiki-format";
import { NoteCard } from "./NoteCard";
import { useWorkspace } from "./WorkspaceContext";
import MarkdownPreview from "./MarkdownPreview";
import ConnectionsPanel from "./ConnectionsPanel";

export function NoteDetail({ id }: { id: string }) {
  const { version, noteVersion, refreshNotes } = useWorkspace();
  const [attempt, setAttempt] = useState(0),
    [notice, setNotice] = useState("");
  const [snapshot, setSnapshot] = useState<{
    key: string;
    id: string;
    note: Note | null;
    error: string;
  } | null>(null);
  const sequence = useRef(0),
    key = id + ":" + version + ":" + noteVersion + ":" + attempt;
  useEffect(() => {
    const number = ++sequence.current,
      controller = new AbortController();
    requestJSON<Note>("/api/notes/" + encodeURIComponent(id), {
      signal: controller.signal,
    })
      .then((note) => {
        if (number === sequence.current)
          setSnapshot({ key, id, note, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted && number === sequence.current)
          setSnapshot((previous) => ({
            key,
            id,
            note: previous?.id === id ? previous.note : null,
            error: error.message,
          }));
      });
    return () => controller.abort();
  }, [id, key]);
  const note = snapshot?.id === id ? snapshot.note : null;
  const loading = snapshot?.key !== key;
  return (
    <section className="mx-auto max-w-[1200px] space-y-6 px-4 py-8">
      <Link href="/dashboard" className="text-sm underline">
        Back to notes
      </Link>
      {loading && <p role="status">Loading note…</p>}
      {snapshot?.key === key && snapshot.error && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--border)] p-5"
        >
          Could not open or refresh this note. {snapshot.error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt((old) => old + 1)}
          >
            Retry note
          </button>{" "}
          <a
            href="/auth/signin"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Sign in in another tab
          </a>
        </div>
      )}
      {note?.deleted ? (
        <p>
          This note is in{" "}
          <Link href="/dashboard/trash" className="underline">
            Trash
          </Link>
          . Restore it before opening its connections.
        </p>
      ) : (
        note && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-[var(--accent)]">
                  {note.archived ? "Archived note" : "Connected note"}
                </p>
                <h1 className="max-w-3xl break-words text-3xl font-semibold">
                  {note.title || "Untitled"}
                </h1>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(stableWikiLink(note));
                    setNotice("Stable wiki link copied.");
                  } catch {
                    setNotice(
                      "Clipboard was unavailable. Use Link note in another note's editor.",
                    );
                  }
                }}
              >
                Copy stable wiki link
              </button>
            </div>
            {notice && (
              <p role="status" className="text-sm">
                {notice}
              </p>
            )}
            <NoteCard note={note} onUpdate={refreshNotes} detail />
            {!note.isList && (
              <div className="note-reading">
                <MarkdownPreview value={note.body} />
              </div>
            )}
            <ConnectionsPanel noteId={note.id} />
          </>
        )
      )}
    </section>
  );
}
