"use client";
import { useEffect, useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

const example = `# A place for the next thought

Good notes should be easy to write, easy to find, and yours to take with you.

## A small plan

- Capture the idea while it is fresh.
- Keep related work together with labels.
- Review the source, then save deliberately.

> Fewer interruptions. More room to think.

| Action | How it works |
| --- | --- |
| Write | Markdown source with undo and search |
| Review | Preview, or keep both views side by side |
| Navigate | Standard keys by default; Vim if you prefer |
| Take it with you | Download the exact Markdown source |

Try **bold**, *emphasis*, or a [reference](https://www.markdownguide.org/basic-syntax/).

\`\`\`javascript
const nextStep = "Make something useful.";
\`\`\`
`;

export function EditorDemo() {
  const [body, setBody] = useState(example);
  const [version, setVersion] = useState(0);
  const dirty = body !== example;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        !window.confirm(
          "Leave this scratchpad? Download your changes first if you want to keep them.",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  return (
    <>
      <MarkdownEditor
        key={version}
        value={body}
        onChange={setBody}
        title="Noteweld scratchpad"
        dirty={dirty}
        saveMode="download"
        idleLabel="Browser-only example"
        dirtyLabel="Browser-only draft"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
        <p>Your edits are not uploaded or saved to an account.</p>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-4 py-2"
          onClick={() => {
            if (
              !dirty ||
              window.confirm(
                "Reset this scratchpad? Download your changes first if you want to keep them.",
              )
            ) {
              setBody(example);
              setVersion((previous) => previous + 1);
            }
          }}
        >
          Reset example
        </button>
      </div>
    </>
  );
}
