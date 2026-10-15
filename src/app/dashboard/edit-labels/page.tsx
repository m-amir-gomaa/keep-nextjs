"use client";
import { useRef, useState } from "react";
import type { Label } from "@/types";
import { requestJSON } from "@/lib/client-api";
import { useWorkspace, useDraftGuard } from "@/components/WorkspaceContext";

export default function EditLabelsPage() {
  const { labels, labelError, refreshing, refresh, putLabel, removeLabel } =
    useWorkspace();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  useDraftGuard(
    Boolean(
      name.trim() ||
      (editing && editedName !== labels.find((l) => l.id === editing)?.name),
    ),
  );
  async function mutate(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The label could not be saved. Your input is still here.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const create = () =>
    mutate(async () => {
      const result = await requestJSON<Label>("/api/labels", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      putLabel(result);
      setName("");
      setNotice("Label created.");
    });
  const rename = () =>
    mutate(async () => {
      const result = await requestJSON<Label>("/api/labels/" + editing, {
        method: "PATCH",
        body: JSON.stringify({ name: editedName.trim() }),
      });
      putLabel(result);
      setEditing(null);
      setNotice("Label renamed.");
    });
  const erase = (label: Label) => {
    if (
      window.confirm(
        "Delete the label “" + label.name + "”? Notes will be kept.",
      )
    )
      void mutate(async () => {
        await requestJSON("/api/labels/" + label.id, { method: "DELETE" });
        removeLabel(label.id);
        if (editing === label.id) setEditing(null);
        setNotice("Label deleted. Notes were kept.");
      });
  };
  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Edit labels</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Organize your notes. Renaming a label preserves its links.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void create();
        }}
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <label className="min-w-0 flex-1 text-sm">
          New label
          <input
            aria-label="New label"
            maxLength={100}
            className="input-ghost mt-1 block w-full rounded-lg border border-[var(--border)] p-3"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black"
        >
          Create label
        </button>
      </form>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-[var(--text-secondary)]">
          {notice}
        </p>
      )}
      {labelError && (
        <p role="alert" className="mb-4 text-red-300">
          {labelError}{" "}
          <button type="button" className="underline" onClick={refresh}>
            Retry loading labels
          </button>
        </p>
      )}
      {refreshing && !labels.length && <p role="status">Loading labels…</p>}
      {!labels.length && !refreshing && !labelError && (
        <p className="text-sm text-[var(--text-muted)]">No labels yet.</p>
      )}
      <ul className="space-y-2">
        {labels.map((label) => (
          <li
            key={label.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-main)] p-3"
          >
            {editing === label.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editedName.trim()) void rename();
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  autoFocus
                  aria-label={"Rename " + label.name}
                  disabled={busy}
                  maxLength={100}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="input-ghost min-w-0 flex-1 rounded-lg border border-[var(--border)] p-2"
                />
                <button
                  type="submit"
                  disabled={busy || !editedName.trim()}
                  className="rounded-lg px-2 py-2 text-sm text-[var(--accent)]"
                >
                  Save label name
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg px-2 py-2 text-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancel rename
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 break-words text-sm">
                  {label.name}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg px-2 py-2 text-sm"
                  aria-label={"Edit label " + label.name}
                  onClick={() => {
                    setEditing(label.id);
                    setEditedName(label.name);
                    setError("");
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg px-2 py-2 text-sm text-red-300"
                  aria-label={"Delete label " + label.name}
                  onClick={() => erase(label)}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
