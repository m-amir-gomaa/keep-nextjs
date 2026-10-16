"use client";
import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useDeferredValue,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MAX_NOTE_BODY,
  markdownFilename,
  type MarkdownFormat,
} from "@/lib/markdown";
import type { EditorControls, EditorStatus } from "./CodeEditor";
import { NoteLinkPicker } from "./NoteLinkPicker";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <p className="p-4 text-sm" role="status">
      Loading editor… You can also select Simple text.
    </p>
  ),
});
const MarkdownPreview = dynamic(() => import("./MarkdownPreview"), {
  loading: () => (
    <p className="p-4 text-sm" role="status">
      Preparing preview…
    </p>
  ),
});
type Props = {
  value: string;
  onChange: (value: string) => void;
  title: string;
  disabled?: boolean;
  dirty: boolean;
  idleLabel?: string;
  dirtyLabel?: string;
  currentId?: string;
} & (
  | { onSave: () => void; saveMode?: "save" }
  | { onSave?: never; saveMode: "download" }
);

class EditorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const formats: { kind: MarkdownFormat; label: string }[] = [
  { kind: "bold", label: "Bold" },
  { kind: "italic", label: "Italic" },
  { kind: "heading", label: "Heading" },
  { kind: "list", label: "List" },
  { kind: "quote", label: "Quote" },
  { kind: "code", label: "Code" },
  { kind: "link", label: "Link" },
];
export function MarkdownEditor({
  value,
  onChange,
  title,
  disabled = false,
  onSave,
  dirty,
  saveMode = "save",
  idleLabel = "All changes saved",
  dirtyLabel = "Unsaved changes",
  currentId,
}: Props) {
  const [mode, setMode] = useState<"write" | "preview" | "split">("write");
  const [keys, setKeys] = useState("standard");
  const [controls, setControls] = useState<EditorControls | null>(null);
  const [status, setStatus] = useState<EditorStatus>({
    canUndo: false,
    canRedo: false,
    vimMode: "NORMAL",
  });
  const [notice, setNotice] = useState("");
  const [picking, setPicking] = useState(false);
  const simpleInput = useRef<HTMLTextAreaElement>(null);
  const linkButton = useRef<HTMLButtonElement>(null);
  const deferredValue = useDeferredValue(value);
  const id = useId();
  const ready = useCallback(
    (api: EditorControls | null) => setControls(api),
    [],
  );
  const report = useCallback(
    (next: EditorStatus) =>
      setStatus((previous) =>
        previous.canUndo === next.canUndo &&
        previous.canRedo === next.canRedo &&
        previous.vimMode === next.vimMode
          ? previous
          : next,
      ),
    [],
  );
  const limit = useCallback(
    () =>
      setNotice(
        "This note supports up to 100,000 characters. The last edit was not added; your earlier text is still here.",
      ),
    [],
  );
  const simple = (
    <textarea
      ref={simpleInput}
      aria-label="Note body"
      aria-describedby={id}
      value={value}
      disabled={disabled}
      maxLength={MAX_NOTE_BODY}
      className="note-simple-editor"
      placeholder="Write Markdown…"
      onChange={(event) => {
        onChange(event.target.value);
        setNotice("");
      }}
    />
  );
  const fallback = (
    <>
      <p role="status" className="p-3 text-sm">
        Enhanced editing could not load. Your draft is available in Simple text.
      </p>
      {simple}
    </>
  );
  const active =
    keys !== "simple" && mode !== "preview" && !!controls && !disabled;

  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([value], { type: "text/markdown;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = markdownFilename(title);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Markdown downloaded. This includes your current draft.");
    } catch {
      setNotice(
        "Download was unavailable. Use Simple text to select and copy your draft.",
      );
    }
  }
  const save = () => {
    if (saveMode === "download") download();
    else onSave?.();
  };
  return (
    <section
      className="note-editor"
      aria-label="Markdown editor"
      onKeyDownCapture={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) save();
        }
      }}
      onKeyDown={(event) => {
        if (
          keys === "vim" &&
          event.key === "Escape" &&
          (event.target as HTMLElement).closest(".cm-editor")
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="note-editor-topbar">
        <div className="note-view-switch" role="group" aria-label="Editor view">
          {(["write", "preview", "split"] as const).map((view) => (
            <button
              type="button"
              key={view}
              aria-pressed={mode === view}
              onClick={() => setMode(view)}
              disabled={disabled}
            >
              {view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
        <label className="note-keys">
          Keys{" "}
          <select
            aria-label="Editor keys"
            value={keys}
            disabled={disabled}
            onChange={(event) => {
              setKeys(event.target.value);
              setNotice("");
            }}
          >
            <option value="standard">Standard</option>
            <option value="vim">Vim</option>
            <option value="simple">Simple text</option>
          </select>
        </label>
      </div>
      <div
        className="note-editor-tools"
        role="group"
        aria-label="Markdown tools"
      >
        <button
          ref={linkButton}
          type="button"
          disabled={disabled || mode === "preview"}
          onClick={() => setPicking((old) => !old)}
          aria-expanded={picking}
        >
          Link note
        </button>
        <button
          type="button"
          onClick={() => controls?.undo()}
          disabled={!active || !status.canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => controls?.redo()}
          disabled={!active || !status.canRedo}
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => controls?.search()}
          disabled={!active}
        >
          Find
        </button>
        <span className="note-tool-divider" aria-hidden="true" />
        {formats.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => controls?.format(kind)}
            disabled={!active}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={download} disabled={disabled}>
          Download .md
        </button>
      </div>
      {picking && (
        <NoteLinkPicker
          currentId={currentId}
          onCancel={() => {
            setPicking(false);
            linkButton.current?.focus();
          }}
          onInsert={(text) => {
            if (keys !== "simple" && controls) controls.insert(text);
            else {
              const start = simpleInput.current?.selectionStart ?? value.length,
                end = simpleInput.current?.selectionEnd ?? start;
              const next = value.slice(0, start) + text + value.slice(end);
              if (next.length > MAX_NOTE_BODY) {
                limit();
                return;
              }
              onChange(next);
              requestAnimationFrame(() => {
                simpleInput.current?.focus();
                simpleInput.current?.setSelectionRange(
                  start + text.length,
                  start + text.length,
                );
              });
            }
            setPicking(false);
          }}
        />
      )}
      <div className={"note-editor-panes note-editor-" + mode}>
        <div hidden={mode === "preview"} className="note-write-pane">
          {keys === "simple" ? (
            simple
          ) : (
            <EditorBoundary fallback={fallback}>
              <CodeEditor
                value={value}
                onChange={(next) => {
                  onChange(next);
                  setNotice("");
                }}
                disabled={disabled}
                vimKeys={keys === "vim"}
                onSave={save}
                onReady={ready}
                onStatus={report}
                onLimit={limit}
              />
            </EditorBoundary>
          )}
        </div>
        {mode !== "write" && (
          <EditorBoundary
            fallback={
              <p className="p-4" role="status">
                Preview could not load. Your Markdown source is still available
                in Write.
              </p>
            }
          >
            <div
              className="note-preview-pane"
              aria-busy={deferredValue !== value}
            >
              <MarkdownPreview value={deferredValue} />
            </div>
          </EditorBoundary>
        )}
      </div>
      <div className="note-editor-footer">
        <span>{dirty ? dirtyLabel : idleLabel}</span>
        <span>
          {keys === "vim" ? "VIM · " + status.vimMode + " · " : ""}
          {value.length.toLocaleString()} / 100,000
        </span>
      </div>
      <p id={id} className="note-editor-hint">
        {keys === "vim"
          ? "i: insert · Esc: normal · v: select · u: undo · :w: " +
            (saveMode === "download" ? "download. " : "save. ")
          : ""}
        Ctrl/Cmd+S {saveMode === "download" ? "downloads Markdown" : "saves"}.
        Tab leaves the editor.{" "}
        {keys === "simple"
          ? "Switching to Simple text starts a new undo history. "
          : ""}
        {saveMode === "download"
          ? "This scratchpad lives only in this tab."
          : "Save before leaving; drafts stay in this tab."}
      </p>
      {notice && (
        <p role="status" className="note-editor-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
