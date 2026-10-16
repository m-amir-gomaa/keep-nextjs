"use client";
import { useEffect, useState } from "react";
import { useKnowledge } from "./KnowledgeContext";
import { noteTitle } from "@/lib/knowledge";
import { stableWikiLink } from "@/lib/wiki-format";
export function NoteLinkPicker({
  onInsert,
  onCancel,
  currentId,
}: {
  onInsert: (text: string) => void;
  onCancel: () => void;
  currentId?: string;
}) {
  const knowledge = useKnowledge();
  const ensure = knowledge?.ensure;
  useEffect(() => {
    ensure?.();
  }, [ensure]);
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  if (!knowledge)
    return (
      <div className="note-link-picker">
        <p>
          Link insertion is available in your private workspace. You can still
          write wiki syntax in this scratchpad.
        </p>
        <button type="button" onClick={onCancel}>
          Close note picker
        </button>
      </div>
    );
  const matches = knowledge.notes.filter(
    (note) =>
      note.id !== currentId &&
      (note.title + " " + note.labels.map((label) => label.name).join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const chosen = matches.find((note) => note.id === selected);
  return (
    <div
      className="note-link-picker"
      role="group"
      aria-label="Insert a note link"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <p className="mb-2 text-sm">
        Choose a note. Its stable link will survive renames.
      </p>
      {knowledge.loading && <p role="status">Loading connections…</p>}
      {knowledge.error && (
        <p role="alert">
          {knowledge.error}{" "}
          <button type="button" onClick={knowledge.refresh}>
            Retry connections
          </button>
        </p>
      )}
      {knowledge.ready && (
        <>
          <input
            aria-label="Find a note to link"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles or labels"
            autoFocus
          />
          <select
            aria-label="Note to link"
            value={chosen?.id || ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">
              {matches.length ? "Choose a note" : "No matching notes"}
            </option>
            {matches.map((note) => (
              <option key={note.id} value={note.id}>
                {noteTitle(note)}
                {note.archived ? " · archived" : ""} · {note.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!chosen}
            onClick={() => {
              if (chosen) onInsert(stableWikiLink(chosen));
            }}
          >
            Insert note link
          </button>
        </>
      )}
      <button type="button" onClick={onCancel}>
        Close note picker
      </button>
    </div>
  );
}
