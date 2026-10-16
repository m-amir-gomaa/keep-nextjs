"use client";
import { useMemo } from "react";
import { KnowledgeGraph } from "./KnowledgeGraph";
import MarkdownPreview from "./MarkdownPreview";
import { wikiReferences } from "@/lib/wiki-links";
const sources = [
  {
    id: "example-plan",
    title: "Launch plan",
    body: "# A plan worth connecting\n\nStart with [[Research]], turn the findings into [[Design]], and finish with [[note:example-review|a deliberate review]].\n\nThese are original demonstration notes, kept entirely separate from private accounts.",
    label: "Project",
  },
  {
    id: "example-research",
    title: "Research",
    body: "# Find the useful question\n\nRead the [[Reading list]], collect evidence and record what remains uncertain. Then revisit the [[Launch plan]].",
    label: "Learning",
  },
  {
    id: "example-design",
    title: "Design",
    body: "# Make the path clear\n\nChoose useful defaults and explain recovery. [[Implementation]] should preserve the user's work when a request fails.",
    label: "Project",
  },
  {
    id: "example-build",
    title: "Implementation",
    body: "# Build with recovery in mind\n\nSave explicitly. Keep failed drafts. Test the boundary, then send the result to [[Review]].\n\n```md\n[[This is code, not a connection]]\n```",
    label: "Engineering",
  },
  {
    id: "example-review",
    title: "Review",
    body: "# Check what was actually delivered\n\nInspect the result, test it and compare it against the [[Launch plan]]. An [[Unwritten idea]] remains an unavailable link, without creating a note silently.",
    label: "Engineering",
  },
  {
    id: "example-reading",
    title: "Reading list",
    body: "# Keep the trail\n\nAn archived note can still support [[Research]]. Archive is separate from Trash.",
    label: "Learning",
    archived: true,
  },
];
const hrefFor = (id: string) => "#" + id;
export function GraphExample() {
  const notes = useMemo(
    () =>
      sources.map((source) => ({
        id: source.id,
        title: source.title,
        archived: !!source.archived,
        labels: [{ id: source.label, name: source.label }],
        references: wikiReferences(source.body).links,
        linksTruncated: false,
      })),
    [],
  );
  return (
    <>
      <KnowledgeGraph notes={notes} hrefFor={hrefFor} />
      <div className="mt-12 space-y-8">
        {sources.map((source) => (
          <section
            key={source.id}
            id={source.id}
            className="example-connected-note scroll-mt-8 rounded-xl border border-[var(--border)] p-4"
          >
            <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent)]">
              {source.title}
              {source.archived ? " · archived example" : " · example note"}
            </p>
            <div className="note-reading">
              <MarkdownPreview
                value={source.body}
                notes={notes}
                hrefFor={hrefFor}
              />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
