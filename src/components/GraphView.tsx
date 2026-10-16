"use client";
import { useEffect } from "react";
import { useKnowledge } from "./KnowledgeContext";
import { KnowledgeGraph } from "./KnowledgeGraph";
export function GraphView() {
  const knowledge = useKnowledge(),
    ensure = knowledge?.ensure;
  useEffect(() => {
    ensure?.();
  }, [ensure]);
  return (
    <section className="mx-auto max-w-[1400px] space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your connections</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Explore saved notes, labels and wiki links. Trash is excluded.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          onClick={knowledge?.refresh}
        >
          Refresh graph
        </button>
      </div>
      {knowledge?.error && (
        <p role="alert">
          {knowledge.error}{" "}
          <button
            type="button"
            onClick={knowledge.refresh}
            className="underline"
          >
            Retry graph
          </button>
        </p>
      )}
      {!knowledge?.ready && !knowledge?.error && (
        <p role="status">Loading graph…</p>
      )}
      {knowledge?.ready && <KnowledgeGraph notes={knowledge.notes} />}
    </section>
  );
}
