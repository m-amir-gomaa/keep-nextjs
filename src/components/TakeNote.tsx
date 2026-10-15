"use client";
import React, { useState, useRef, useCallback } from "react";
import { Icons } from "./Icons";
import { ColorPicker } from "./ColorPicker";
import { LabelPicker } from "./LabelPicker";
import { ChecklistEditor } from "./ChecklistEditor";
import { ClientError, requestJSON } from "@/lib/client-api";
import { useDraftGuard } from "./WorkspaceContext";
import type { ListItem } from "@/types";

export function TakeNote({ onNoteAdded }: { onNoteAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isList, setIsList] = useState(false);
  const [items, setItems] = useState<ListItem[]>([{ text: "", isDone: false }]);
  const [pinned, setPinned] = useState(false);
  const [color, setColor] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const requestId = useRef<string | null>(null);
  const [failureStatus, setFailureStatus] = useState(0);
  const dirty =
    expanded &&
    Boolean(title.trim() || body.trim() || items.some((i) => i.text.trim()));
  useDraftGuard(dirty);

  const closeAndSave = useCallback(async () => {
    if (savingRef.current) return;
    const listItems = items
      .filter((item) => item.text.trim())
      .map((item) => ({ ...item, text: item.text.trim() }));
    if (
      title.trim() ||
      (!isList && body.trim()) ||
      (isList && listItems.length)
    ) {
      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        requestId.current ??= crypto.randomUUID();
        await requestJSON("/api/notes", {
          method: "POST",
          headers: { "Idempotency-Key": requestId.current },
          body: JSON.stringify({
            title,
            body: isList ? "" : body,
            pinned,
            color,
            labelIds,
            isList,
            listItems,
          }),
        });
        onNoteAdded();
      } catch (e) {
        setFailureStatus(e instanceof ClientError ? e.status : 0);
        setError(
          e instanceof Error
            ? e.message
            : "Your note could not be saved. Your edits are still here; try again.",
        );
        return;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }
    requestId.current = null;
    setFailureStatus(0);
    setTitle("");
    setBody("");
    setPinned(false);
    setColor("");
    setLabelIds([]);
    setItems([{ text: "", isDone: false }]);
    setIsList(false);
    setExpanded(false);
    setError("");
  }, [title, body, isList, items, pinned, color, labelIds, onNoteAdded]);

  if (!expanded)
    return (
      <div className="max-w-[600px] mx-auto my-8 bg-[var(--surface-main)] rounded-xl border border-[var(--border)] shadow-md flex items-center px-4 py-3 gap-4">
        <button
          type="button"
          className="flex-1 text-left text-[var(--text-secondary)] font-medium"
          onClick={() => {
            setIsList(false);
            setExpanded(true);
          }}
        >
          Take a note...
        </button>
        <button
          type="button"
          aria-label="New list"
          className="icon-btn"
          onClick={() => {
            setIsList(true);
            setExpanded(true);
          }}
        >
          <Icons.Check className="w-6 h-6" />
        </button>
      </div>
    );

  return (
    <section
      aria-label={isList ? "Create checklist" : "Create note"}
      style={{ backgroundColor: color || "var(--surface-main)" }}
      className="max-w-[600px] mx-auto my-8 rounded-xl border border-[var(--border)] shadow-lg"
    >
      <div className="flex items-start p-4 pb-2 gap-3">
        <input
          type="text"
          placeholder="Title"
          aria-label="Note title"
          maxLength={200}
          value={title}
          disabled={saving}
          autoFocus={!isList}
          onChange={(event) => setTitle(event.target.value)}
          className="flex-1 min-w-0 bg-transparent outline-none font-medium"
        />
        <button
          type="button"
          disabled={saving}
          className="icon-btn"
          onClick={() => setPinned(!pinned)}
          aria-label={pinned ? "Unpin note" : "Pin note"}
        >
          {pinned ? <Icons.PinFilled /> : <Icons.Pin />}
        </button>
      </div>
      <div className="px-4 py-2">
        {isList ? (
          <ChecklistEditor
            items={items}
            onChange={setItems}
            disabled={saving}
          />
        ) : (
          <textarea
            placeholder="Take a note..."
            aria-label="Note body"
            maxLength={100000}
            value={body}
            disabled={saving}
            onChange={(event) => setBody(event.target.value)}
            rows={Math.min(18, Math.max(2, body.split("\n").length))}
            className="w-full bg-transparent outline-none text-sm resize-none"
          />
        )}
      </div>
      {error && (
        <div role="alert" className="px-4 py-2 text-sm text-red-300">
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
          {failureStatus === 409 && (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                onNoteAdded();
                if (
                  window.confirm(
                    "Keep this draft as a separate new note? Check the refreshed saved notes first to avoid duplicates.",
                  )
                ) {
                  requestId.current = null;
                  setError("");
                  setFailureStatus(0);
                }
              }}
            >
              Refresh notes / start separate note
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-1">
          <LabelPicker
            selectedLabelIds={labelIds}
            onLabelsChange={setLabelIds}
          />
          <ColorPicker currentColor={color} onColorSelect={setColor} />
        </div>
        <button
          type="button"
          disabled={saving}
          className="px-3 py-2 text-sm"
          onClick={() => {
            if (!dirty || window.confirm("Discard this unsaved note?")) {
              requestId.current = null;
              setTitle("");
              setBody("");
              setItems([{ text: "", isDone: false }]);
              setExpanded(false);
              setError("");
              setLabelIds([]);
              setColor("");
              setPinned(false);
              setFailureStatus(0);
            }
          }}
        >
          Discard draft
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={closeAndSave}
          className="px-6 py-2 text-sm font-medium rounded-md hover:bg-white/5"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </section>
  );
}
