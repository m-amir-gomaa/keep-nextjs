"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  placeholder,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  undo,
  redo,
  undoDepth,
  redoDepth,
} from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { markdown } from "@codemirror/lang-markdown";
import { openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import { boundedNote, exactNoteLines } from "@/lib/editor-state";
import { formatMarkdown, type MarkdownFormat } from "@/lib/markdown";

export type EditorStatus = {
  canUndo: boolean;
  canRedo: boolean;
  vimMode: string;
};
export type EditorControls = {
  insert: (text: string) => void;
  undo: () => void;
  redo: () => void;
  search: () => void;
  format: (kind: MarkdownFormat) => void;
};
type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  vimKeys: boolean;
  onSave: () => void;
  onReady: (controls: EditorControls | null) => void;
  onStatus: (status: EditorStatus) => void;
  onLimit: () => void;
};

// Vim's Ex registry is global; route writes by the actual editor instance, never by a last-opened note.
const saveHandlers = new WeakMap<EditorView, () => void>();
Vim.defineEx("write", "w", (cm) => {
  saveHandlers.get(cm.cm6)?.();
});
const noteHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "#ffd074", fontWeight: "600" },
  { tag: [tags.url, tags.link], color: "#9bc5ff", textDecoration: "underline" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.quote, color: "#c7b4ee" },
  { tag: [tags.monospace, tags.string], color: "#a8d7a0" },
  { tag: [tags.tagName, tags.keyword], color: "#8ed6d0" },
  {
    tag: [tags.comment, tags.processingInstruction, tags.meta],
    color: "#b1b4bd",
  },
]);

export default function CodeEditor(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const latest = useRef(props);
  const keys = useRef(new Compartment());
  const enabled = useRef(new Compartment());
  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    if (!host.current) return;
    let alive = true;
    const publish = (view: EditorView) => {
      const state = getCM(view)?.state.vim;
      latest.current.onStatus({
        canUndo: undoDepth(view.state) > 0,
        canRedo: redoDepth(view.state) > 0,
        vimMode: state?.visualMode
          ? "VISUAL"
          : state?.insertMode
            ? "INSERT"
            : "NORMAL",
      });
    };
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: latest.current.value,
        extensions: [
          exactNoteLines,
          keys.current.of(latest.current.vimKeys ? vim() : []),
          enabled.current.of([
            EditorState.readOnly.of(latest.current.disabled),
            EditorView.editable.of(!latest.current.disabled),
          ]),
          history(),
          drawSelection(),
          highlightActiveLine(),
          markdown(),
          search({ top: true }),
          syntaxHighlighting(noteHighlight),
          EditorView.lineWrapping,
          placeholder("Write Markdown. Your notes, your words."),
          EditorView.contentAttributes.of({
            "aria-label": "Note body",
            "aria-multiline": "true",
            role: "textbox",
            spellcheck: "true",
          }),
          // Tab keeps its normal browser focus behavior. No keyboard trap or forced indentation.
          Prec.highest(
            keymap.of([
              {
                key: "Mod-s",
                run: () => {
                  if (!latest.current.disabled) latest.current.onSave();
                  return true;
                },
              },
            ]),
          ),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          boundedNote(() => {
            if (alive) latest.current.onLimit();
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              latest.current.onChange(update.state.sliceDoc());
            publish(update.view);
          }),
          EditorView.theme(
            {
              "&": {
                backgroundColor: "transparent",
                color: "var(--text-primary)",
              },
              ".cm-content": {
                minHeight: "14rem",
                padding: "16px 0",
                caretColor: "var(--accent)",
              },
              ".cm-scroller": {
                overflow: "auto",
                fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                fontSize: "14px",
                lineHeight: "1.8",
              },
              ".cm-line": { padding: "0 16px" },
              "&.cm-focused": { outline: "none" },
              ".cm-cursor, .cm-dropCursor": {
                borderLeftColor: "var(--accent)",
              },
              "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
                { backgroundColor: "#4a3e24 !important" },
              ".cm-activeLine": { backgroundColor: "var(--hover-main)" },
              ".cm-panels": {
                backgroundColor: "var(--surface-overlay)",
                color: "var(--text-primary)",
              },
            },
            { dark: true },
          ),
        ],
      }),
    });
    editor.current = view;
    saveHandlers.set(view, () => {
      if (!latest.current.disabled) latest.current.onSave();
    });
    latest.current.onReady({
      insert: (text) => {
        if (latest.current.disabled) return;
        view.dispatch({
          ...view.state.replaceSelection(text),
          scrollIntoView: true,
          annotations: Transaction.userEvent.of("input.link"),
        });
        view.focus();
      },
      undo: () => {
        if (!latest.current.disabled) undo(view);
        view.focus();
      },
      redo: () => {
        if (!latest.current.disabled) redo(view);
        view.focus();
      },
      search: () => {
        openSearchPanel(view);
      },
      format: (kind) => {
        if (latest.current.disabled) return;
        const { from, to } = view.state.selection.main;
        const change = formatMarkdown(view.state.sliceDoc(), from, to, kind);
        view.dispatch({
          changes: { from: change.from, to: change.to, insert: change.insert },
          selection: { anchor: change.anchor, head: change.head },
          scrollIntoView: true,
          annotations: Transaction.userEvent.of("input.format"),
        });
        view.focus();
      },
    });
    publish(view);
    return () => {
      alive = false;
      saveHandlers.delete(view);
      latest.current.onReady(null);
      view.destroy();
      editor.current = null;
    };
  }, []);

  useEffect(() => {
    const view = editor.current;
    if (!view || view.state.sliceDoc() === props.value) return;
    // Prop echoes do not create extra undo entries. A deliberate saved-version reload
    // remounts the editor at the parent boundary to reset the discarded draft's history.
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: props.value },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [props.value]);
  useEffect(() => {
    const view = editor.current;
    if (!view) return;
    view.dispatch({
      effects: keys.current.reconfigure(props.vimKeys ? vim() : []),
    });
    const cm = getCM(view);
    const modeChanged = () =>
      latest.current.onStatus({
        canUndo: undoDepth(view.state) > 0,
        canRedo: redoDepth(view.state) > 0,
        vimMode: cm?.state.vim?.visualMode
          ? "VISUAL"
          : cm?.state.vim?.insertMode
            ? "INSERT"
            : "NORMAL",
      });
    cm?.on("vim-mode-change", modeChanged);
    return () => {
      cm?.off("vim-mode-change", modeChanged);
    };
  }, [props.vimKeys]);
  useEffect(() => {
    editor.current?.dispatch({
      effects: enabled.current.reconfigure([
        EditorState.readOnly.of(props.disabled),
        EditorView.editable.of(!props.disabled),
      ]),
    });
  }, [props.disabled]);
  return <div ref={host} className="note-code-editor" />;
}
