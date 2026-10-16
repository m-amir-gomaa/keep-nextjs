"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownUrl } from "@/lib/markdown";
import { useEffect, useMemo } from "react";
import { wikiMarkdown } from "@/lib/wiki-links";
import {
  knowledgeIndex,
  noteHref,
  noteTitle,
  resolveWiki,
  type KnowledgeNote,
} from "@/lib/knowledge";
import { useKnowledge } from "./KnowledgeContext";
const plugins = [remarkGfm];

export default function MarkdownPreview({
  value,
  notes,
  hrefFor = noteHref,
}: {
  value: string;
  notes?: KnowledgeNote[];
  hrefFor?: (id: string) => string;
}) {
  const knowledge = useKnowledge(),
    ensure = knowledge?.ensure;
  const parsed = useMemo(() => wikiMarkdown(value), [value]);
  const index = useMemo(
    () => (notes ? knowledgeIndex(notes) : knowledge?.index),
    [notes, knowledge?.index],
  );
  useEffect(() => {
    if (parsed.links.length && !notes) ensure?.();
  }, [parsed.links.length, notes, ensure]);
  const ready = !!notes || !!knowledge?.ready;
  return (
    <div className="note-markdown" aria-label="Markdown preview" role="region">
      {value.trim() ? (
        <Markdown
          skipHtml
          remarkPlugins={plugins}
          urlTransform={(url) =>
            /^noteweld-wiki:\d+$/.test(url) &&
            parsed.links[Number(url.slice(14))]
              ? url
              : markdownUrl(url) || ""
          }
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith("noteweld-wiki:")) {
                const reference = parsed.links[Number(href.slice(14))];
                if (!reference) return <span>{children}</span>;
                const resolved =
                  ready && index ? resolveWiki(reference.target, index) : null;
                if (resolved?.status === "resolved")
                  return (
                    <a
                      className="wiki-link"
                      href={hrefFor(resolved.note.id)}
                      title={"Open note: " + noteTitle(resolved.note)}
                    >
                      {reference.alias ||
                        (reference.target.startsWith("note:")
                          ? noteTitle(resolved.note)
                          : children)}
                    </a>
                  );
                const reason = !ready
                  ? knowledge?.error
                    ? "connections unavailable"
                    : knowledge
                      ? "loading connections"
                      : "workspace link"
                  : resolved?.status === "ambiguous"
                    ? "ambiguous title"
                    : "unavailable";
                return (
                  <span className="wiki-unavailable" title={reason}>
                    {children}
                    <small> · {reason}</small>
                  </span>
                );
              }
              return href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  {children}
                </a>
              ) : (
                <span>{children}</span>
              );
            },
            img: ({ src, alt }) => (
              <span className="note-image-placeholder">
                Image: {alt || "Untitled image"}
                {typeof src === "string" && markdownUrl(src) && (
                  <>
                    {" · "}
                    <a
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      Open image externally
                    </a>
                  </>
                )}
              </span>
            ),
          }}
        >
          {parsed.markdown}
        </Markdown>
      ) : (
        <p className="text-[var(--text-muted)]">
          Your formatted note will appear here.
        </p>
      )}
      {parsed.truncated && (
        <p role="status">
          Only the first 256 wiki references are connected. The full source is
          retained.
        </p>
      )}
    </div>
  );
}
