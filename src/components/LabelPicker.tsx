"use client";
import { useEffect, useRef, useState } from "react";
import { Icons } from "./Icons";
import { useWorkspace } from "./WorkspaceContext";
type Props = {
  selectedLabelIds: string[];
  onLabelsChange: (ids: string[]) => void;
};
export function LabelPicker({ selectedLabelIds, onLabelsChange }: Props) {
  const { labels, labelError, refresh, refreshing } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="icon-btn"
        aria-label="Add labels"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icons.Label />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-56 max-w-[calc(100vw-3rem)] rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3 shadow-xl"
          role="group"
          aria-label="Label selection"
        >
          <label className="block text-xs">
            Find a label
            <input
              autoFocus
              aria-label="Search labels"
              className="input-ghost my-2 w-full rounded-lg border border-[var(--border)] p-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {labelError && (
            <p role="alert" className="text-xs text-red-300">
              {labelError}
              <button
                type="button"
                onClick={refresh}
                className="ml-2 underline"
              >
                Retry labels
              </button>
            </p>
          )}
          {refreshing && (
            <p role="status" className="text-xs text-[var(--text-muted)]">
              Refreshing labels…
            </p>
          )}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {labels
              .filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
              .map((label) => (
                <label
                  key={label.id}
                  className="flex min-h-9 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.includes(label.id)}
                    onChange={() =>
                      onLabelsChange(
                        selectedLabelIds.includes(label.id)
                          ? selectedLabelIds.filter((id) => id !== label.id)
                          : [...selectedLabelIds, label.id],
                      )
                    }
                  />
                  <span className="break-words">{label.name}</span>
                </label>
              ))}
            {!labels.length && !refreshing && !labelError && (
              <p className="text-xs text-[var(--text-muted)]">
                Create labels under Edit labels.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
