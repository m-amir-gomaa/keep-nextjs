import { EditorState } from "@codemirror/state";
import { MAX_NOTE_BODY } from "./markdown";

export function boundedNote(onLimit: () => void) {
  return EditorState.transactionFilter.of((transaction) => {
    if (transaction.docChanged && transaction.newDoc.length > MAX_NOTE_BODY) {
      // Filters run during dispatch: defer UI notification until after it finishes.
      queueMicrotask(onLimit);
      return [];
    }
    return transaction;
  });
}

// Explicit LF splitting preserves existing CR characters, including mixed CRLF/LF input.
export const exactNoteLines = EditorState.lineSeparator.of("\n");
