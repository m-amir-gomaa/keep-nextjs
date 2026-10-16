"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { Note, ListItem } from "@/types";
import { parseListItems } from "@/lib/note-content";
import { ClientError, requestJSON } from "@/lib/client-api";
import { useDraftGuard } from "./WorkspaceContext";
import { Icons } from "./Icons";
import { LabelPicker } from "./LabelPicker";
import { ColorPicker } from "./ColorPicker";
import { ChecklistEditor } from "./ChecklistEditor";
import { MarkdownEditor } from "./MarkdownEditor";

const ConnectionsPanel = dynamic(() => import("./ConnectionsPanel"), {
  loading: () => <p role="status">Loading connections…</p>,
});
type Props = { note: Note; onUpdate: () => void; detail?: boolean };
export function NoteCard({ note, onUpdate, detail = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState(note);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [color, setColor] = useState(note.color);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [error, setError] = useState("");
  const [failureStatus, setFailureStatus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const dirty =
    editing &&
    (title !== base.title ||
      body !== base.body ||
      color !== base.color ||
      JSON.stringify([...labelIds].sort()) !==
        JSON.stringify(base.labels.map((l) => l.id).sort()) ||
      (base.isList &&
        JSON.stringify(items) !==
          JSON.stringify(parseListItems(base.listItems))));
  useDraftGuard(dirty);
  function fill(saved: Note) {
    setBase(saved);
    setTitle(saved.title);
    setBody(saved.body);
    setColor(saved.color);
    setLabelIds(saved.labels.map((l) => l.id));
    setItems(parseListItems(saved.listItems));
    setError("");
    setFailureStatus(0);
  }
  function open() {
    if (note.deleted || pending.current) return;
    fill(note);
    setEditing(true);
  }
  useEffect(() => {
    if (!editing) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    titleInput.current?.focus();
    return () => {
      if (element.open) element.close();
    };
  }, [editing]);
  async function perform(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setFailureStatus(0);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The operation failed. Retry without discarding your draft.",
      );
      setFailureStatus(e instanceof ClientError ? e.status : 0);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function saveAndClose(close = true) {
    if (pending.current) return;
    if (!dirty) {
      if (close) setEditing(false);
      return;
    }
    await perform(async () => {
      const saved = await requestJSON<Note>("/api/notes/" + base.id, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          body,
          color,
          labelIds,
          listItems: base.isList ? items : undefined,
          expectedRevision: base.revision,
        }),
      });
      fill(saved);
      if (close) setEditing(false);
      onUpdate();
    });
  }
  const change = (fields: object, method = "PATCH") =>
    perform(async () => {
      await requestJSON("/api/notes/" + note.id, {
        method,
        headers:
          method === "DELETE" ? { "If-Match": String(note.revision) } : {},
        body:
          method === "PATCH"
            ? JSON.stringify({ ...fields, expectedRevision: note.revision })
            : undefined,
      });
      onUpdate();
    });
  const discard = () => {
    if (
      !dirty ||
      window.confirm("Discard your unsaved changes to this note?")
    ) {
      setEditing(false);
      setError("");
    }
  };
  async function copyDraft() {
    const content = [
      title,
      base.isList
        ? items
            .map((i) => "- [" + (i.isDone ? "x" : " ") + "] " + i.text)
            .join("\n")
        : body,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError(
        "Clipboard access was unavailable. Select and copy your draft text before reloading.",
      );
    }
  }
  const rows = parseListItems(note.listItems);
  return (
    <>
      <article
        data-note-id={note.id}
        className="min-w-0 rounded-xl border border-[var(--border)] p-4 [overflow-wrap:anywhere]"
        style={{ backgroundColor: note.color || "var(--surface-main)" }}
      >
        <button
          type="button"
          className="mb-2 block w-full text-left"
          aria-label={
            detail ? "Edit note" : "Open note " + (note.title || "Untitled")
          }
          disabled={note.deleted || busy}
          onClick={open}
        >
          <h3 className="font-medium">
            {detail
              ? "Edit note"
              : note.title || (note.isList ? "Checklist" : "Untitled")}
          </h3>
          {!note.isList && !detail && (
            <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {note.body}
            </p>
          )}
        </button>
        {note.isList && (
          <ul className="space-y-2">
            {(detail ? rows : rows.slice(0, 5)).map((item, index) => (
              <li key={index}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.isDone}
                    disabled={note.deleted || busy}
                    aria-label={item.text}
                    onChange={() => {
                      const next = rows.map((v, i) =>
                        i === index ? { ...v, isDone: !v.isDone } : { ...v },
                      );
                      void change({ listItems: JSON.stringify(next) });
                    }}
                  />
                  <span
                    className={item.isDone ? "line-through opacity-60" : ""}
                  >
                    {item.text}
                  </span>
                </label>
              </li>
            ))}
            {!detail && rows.length > 5 && (
              <li className="text-xs text-[var(--text-muted)]">
                + {rows.length - 5} more items
              </li>
            )}
          </ul>
        )}
        {!!note.labels.length && (
          <div className="mt-3 flex flex-wrap gap-1">
            {note.labels.map((l) => (
              <span
                key={l.id}
                className="rounded-full border border-[var(--border)] px-2 py-1 text-xs"
              >
                {l.name}
              </span>
            ))}
          </div>
        )}
        {error && !editing && (
          <div role="alert" className="mt-3 text-sm text-red-300">
            {error}
            <button type="button" className="ml-2 underline" onClick={onUpdate}>
              Refresh saved notes
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1">
          {note.deleted ? (
            <>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg px-2 py-2 text-sm"
                onClick={() => void change({ deleted: false })}
              >
                Restore
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg px-2 py-2 text-sm text-red-300"
                onClick={() => {
                  if (
                    window.confirm(
                      "Permanently delete this note? This cannot be undone.",
                    )
                  )
                    void change({}, "DELETE");
                }}
              >
                Delete forever
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                aria-label={note.pinned ? "Unpin note" : "Pin note"}
                onClick={() => void change({ pinned: !note.pinned })}
              >
                {note.pinned ? <Icons.PinFilled /> : <Icons.Pin />}
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                aria-label={note.archived ? "Unarchive" : "Archive"}
                onClick={() => void change({ archived: !note.archived })}
              >
                <Icons.Archive />
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                aria-label="Move to trash"
                onClick={() => void change({ deleted: true })}
              >
                <Icons.Trash />
              </button>
            </>
          )}
        </div>
      </article>
      {editing &&
        createPortal(
          <dialog
            ref={dialog}
            aria-label="Edit note"
            className="m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-[1000px] overflow-y-auto rounded-xl border border-[var(--border)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60"
            style={{ backgroundColor: color || "var(--surface-overlay)" }}
            onKeyDownCapture={(event) => {
              if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "s"
              ) {
                event.preventDefault();
                event.stopPropagation();
                if (!busy) void saveAndClose(false);
              }
            }}
            onCancel={(e) => {
              e.preventDefault();
              discard();
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) discard();
            }}
          >
            <div className="p-4">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text-secondary)]">
                Edit note{dirty ? " · unsaved changes" : ""}
              </h2>
              <fieldset disabled={busy} className="min-w-0 space-y-3">
                <label className="block text-sm">
                  Title
                  <input
                    ref={titleInput}
                    type="text"
                    aria-label="Note title"
                    placeholder="Title"
                    maxLength={200}
                    className="input-ghost mt-1 w-full rounded-lg border border-[var(--border)] p-2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                {base.isList ? (
                  <ChecklistEditor items={items} onChange={setItems} />
                ) : (
                  <MarkdownEditor
                    key={editorVersion}
                    value={body}
                    onChange={setBody}
                    title={title}
                    disabled={busy}
                    onSave={() => void saveAndClose(false)}
                    dirty={dirty}
                    currentId={base.id}
                  />
                )}
                <div className="flex gap-2">
                  <LabelPicker
                    selectedLabelIds={labelIds}
                    onLabelsChange={setLabelIds}
                  />
                  <ColorPicker currentColor={color} onColorSelect={setColor} />
                </div>
                {!base.isList && (
                  <details
                    className="note-connections-disclosure"
                    onToggle={(event) =>
                      setConnectionsOpen(event.currentTarget.open)
                    }
                  >
                    <summary>Links and backlinks</summary>
                    {connectionsOpen && (
                      <ConnectionsPanel noteId={base.id} body={body} />
                    )}
                  </details>
                )}
                {error && (
                  <div role="alert" className="text-sm text-red-300">
                    {error}
                    {failureStatus === 401 && (
                      <a
                        href="/auth/signin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 underline"
                      >
                        Sign in in another tab
                      </a>
                    )}
                  </div>
                )}
                {error && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button
                      type="button"
                      className="underline"
                      onClick={copyDraft}
                    >
                      Copy draft
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Replace this draft with the latest saved note? Copy your draft first if you want to keep it.",
                          )
                        )
                          void perform(async () => {
                            const saved = await requestJSON<Note>(
                              "/api/notes/" + base.id,
                            );
                            fill(saved);
                            setEditorVersion((version) => version + 1);
                            onUpdate();
                          });
                      }}
                    >
                      Reload saved version
                    </button>
                  </div>
                )}
                <div className="note-dialog-actions flex flex-wrap justify-end gap-3 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                    disabled={!dirty}
                    onClick={() => void saveAndClose(false)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-sm"
                    onClick={discard}
                  >
                    Discard changes
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
                    onClick={() => void saveAndClose()}
                  >
                    {busy ? "Saving…" : "Save & close"}
                  </button>
                </div>
              </fieldset>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
