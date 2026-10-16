"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownUrl } from "@/lib/markdown";
const plugins = [remarkGfm];

export default function MarkdownPreview({ value }: { value: string }) {
  return (
    <div className="note-markdown" aria-label="Markdown preview" role="region">
      {value.trim() ? (
        <Markdown
          skipHtml
          remarkPlugins={plugins}
          urlTransform={(url) => markdownUrl(url) || ""}
          components={{
            a: ({ href, children }) =>
              href ? (
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
              ),
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
          {value}
        </Markdown>
      ) : (
        <p className="text-[var(--text-muted)]">
          Your formatted note will appear here.
        </p>
      )}
    </div>
  );
}
