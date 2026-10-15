"use client";
import { useState } from "react";
import { NoteCard } from "./NoteCard";
import { TakeNote } from "./TakeNote";
import { useNotes } from "./useNotes";
import { useWorkspace } from "./WorkspaceContext";
import { useDashboardSearch } from "./DashboardSearchContext";
import { noteMatchesQuery } from "@/lib/note-content";
import { requestJSON } from "@/lib/client-api";
import Link from "next/link";

type Props = {
  view?: "active" | "archive" | "trash" | "label";
  label?: string;
};
export function NotesView({ view = "active", label }: Props) {
  const { labels, refreshing } = useWorkspace();
  const { query } = useDashboardSearch();
  const path =
    view === "archive"
      ? "/api/notes/archive"
      : view === "trash"
        ? "/api/notes/trash"
        : "/api/notes";
  const { notes, loading, error, reload } = useNotes(path);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const selected = labels.find((l) => l.id === label || l.name === label);
  const scoped =
    view === "label"
      ? notes.filter(
          (n) => selected && n.labels.some((l) => l.id === selected.id),
        )
      : notes;
  const filtered = scoped.filter((n) => noteMatchesQuery(n, query));
  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);
  async function emptyTrash() {
    if (
      deleting ||
      !window.confirm(
        "Permanently delete the " +
          notes.length +
          " reviewed notes in trash? This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setDeleteError("");
    try {
      await requestJSON("/api/notes/trash", {
        method: "DELETE",
        body: JSON.stringify({
          notes: notes.map((n) => ({ id: n.id, revision: n.revision })),
        }),
      });
      reload();
    } catch (e) {
      setDeleteError(
        e instanceof Error
          ? e.message
          : "Trash could not be emptied. Refresh and retry.",
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {view === "active"
            ? "Notes"
            : view === "label"
              ? selected?.name || "Label notes"
              : view === "archive"
                ? "Archive"
                : "Trash"}
        </h1>
        {view === "trash" && !!notes.length && (
          <button
            type="button"
            disabled={deleting || loading}
            className="rounded-lg px-3 py-2 text-sm text-red-300"
            onClick={emptyTrash}
          >
            {deleting ? "Deleting…" : "Empty Trash"}
          </button>
        )}
      </div>
      {view === "active" && <TakeNote onNoteAdded={reload} />}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-400/30 p-4 text-sm text-red-300"
        >
          {error}
          <button type="button" className="ml-3 underline" onClick={reload}>
            Retry loading notes
          </button>{" "}
          <a
            href="/auth/signin"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 underline"
          >
            Sign in in another tab
          </a>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {deleteError}
        </p>
      )}
      {loading && (
        <p role="status" className="mb-6 text-sm text-[var(--text-muted)]">
          {notes.length ? "Refreshing notes…" : "Loading notes…"}
        </p>
      )}
      {view === "label" && !selected && !refreshing && (
        <p className="text-sm text-[var(--text-muted)]">
          This label was renamed or removed. Choose a label from navigation or{" "}
          <Link href="/dashboard/edit-labels" className="underline">
            manage labels
          </Link>
          .
        </p>
      )}
      {!!pinned.length && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Pinned
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} onUpdate={reload} />
            ))}
          </div>
        </div>
      )}
      {!!others.length && (
        <div>
          {!!pinned.length && (
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Other notes
            </h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((note) => (
              <NoteCard key={note.id} note={note} onUpdate={reload} />
            ))}
          </div>
        </div>
      )}
      {!loading &&
        !error &&
        !filtered.length &&
        (view !== "label" || selected) && (
          <p className="my-16 text-center text-[var(--text-muted)]">
            {query && scoped.length
              ? "No notes match “" + query + "”."
              : view === "trash"
                ? "Trash is empty."
                : view === "archive"
                  ? "Archived notes will appear here."
                  : "No notes here yet."}
          </p>
        )}
    </section>
  );
}
