"use client";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useKnowledge } from "./KnowledgeContext";
import { noteHref, noteTitle, resolveWiki } from "@/lib/knowledge";
import { wikiReferences } from "@/lib/wiki-links";

export default function ConnectionsPanel({
  noteId,
  body,
}: {
  noteId: string;
  body?: string;
}) {
  const knowledge = useKnowledge(),
    ensure = knowledge?.ensure;
  const deferred = useDeferredValue(body);
  const draft = useMemo(
    () => (deferred === undefined ? null : wikiReferences(deferred)),
    [deferred],
  );
  useEffect(() => {
    ensure?.();
  }, [ensure]);
  if (!knowledge) return null;
  if (knowledge.error)
    return (
      <div role="alert" className="connections-panel">
        {knowledge.error}{" "}
        <button type="button" className="underline" onClick={knowledge.refresh}>
          Retry connections
        </button>
      </div>
    );
  if (!knowledge.ready)
    return (
      <p role="status" className="connections-panel">
        Loading connections…
      </p>
    );
  const current = knowledge.notes.find((note) => note.id === noteId);
  const references = draft?.links || current?.references || [];
  const outgoing = [
    ...new Map(
      references.map((reference) => [reference.target, reference]),
    ).values(),
  ];
  const incoming = knowledge.notes.filter(
    (note) =>
      note.id !== noteId &&
      note.references.some((reference) => {
        const resolved = resolveWiki(reference.target, knowledge.index);
        return resolved.status === "resolved" && resolved.note.id === noteId;
      }),
  );
  return (
    <section
      className="connections-panel"
      aria-label="Note connections"
      aria-busy={body !== deferred}
    >
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          {body !== undefined ? "Outgoing links use this draft. " : ""}Backlinks
          use saved notes.
        </p>
        <button
          type="button"
          className="text-xs underline"
          onClick={knowledge.refresh}
        >
          Refresh connections
        </button>
      </div>
      <div className="connections-columns">
        <div>
          <h3>Outgoing · {outgoing.length}</h3>
          {!outgoing.length ? (
            <p>No wiki links yet. Use Link note in the editor.</p>
          ) : (
            <ul>
              {outgoing.map((reference, i) => {
                const resolved = resolveWiki(reference.target, knowledge.index);
                return (
                  <li key={i}>
                    {resolved.status === "resolved" ? (
                      <a href={noteHref(resolved.note.id)}>
                        {reference.alias || noteTitle(resolved.note)}
                        {resolved.note.archived ? " · archived" : ""}
                      </a>
                    ) : (
                      <span className="wiki-unavailable">
                        {reference.alias || reference.target} ·{" "}
                        {resolved.status === "ambiguous"
                          ? `ambiguous (${resolved.count} matches)`
                          : "unavailable"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h3>Backlinks · {incoming.length}</h3>
          {!incoming.length ? (
            <p>No saved notes link here yet.</p>
          ) : (
            <ul>
              {incoming.map((note) => (
                <li key={note.id}>
                  <a href={noteHref(note.id)}>
                    {noteTitle(note)}
                    {note.archived ? " · archived" : ""}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {(draft?.truncated ||
        current?.linksTruncated ||
        knowledge.notes.some((note) => note.linksTruncated)) && (
        <p role="status" className="mt-3">
          Some notes exceed 256 wiki references. Only their first 256 references
          are connected.
        </p>
      )}
    </section>
  );
}
