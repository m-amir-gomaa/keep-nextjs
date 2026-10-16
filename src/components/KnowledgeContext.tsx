"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWorkspace } from "./WorkspaceContext";
import { requestJSON } from "@/lib/client-api";
import { knowledgeIndex, type KnowledgeNote } from "@/lib/knowledge";

type Knowledge = {
  notes: KnowledgeNote[];
  index: ReturnType<typeof knowledgeIndex>;
  ready: boolean;
  loading: boolean;
  error: string;
  ensure: () => void;
  refresh: () => void;
};
const Context = createContext<Knowledge | null>(null);
export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const { version, noteVersion } = useWorkspace();
  const [enabled, setEnabled] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    notes: KnowledgeNote[];
    error: string;
  } | null>(null);
  const sequence = useRef(0),
    key = version + ":" + noteVersion + ":" + attempt;
  const ensure = useCallback(() => setEnabled(true), []);
  const refresh = useCallback(() => {
    setEnabled(true);
    setAttempt((old) => old + 1);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const id = ++sequence.current,
      controller = new AbortController();
    requestJSON<{ notes: KnowledgeNote[] }>("/api/knowledge", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!Array.isArray(result.notes))
          throw new Error("Connections could not be read.");
        if (id === sequence.current)
          setSnapshot({ key, notes: result.notes, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted && id === sequence.current)
          setSnapshot({ key, notes: [], error: error.message });
      });
    return () => controller.abort();
  }, [enabled, key]);
  const notes = useMemo(
    () => (snapshot?.key === key ? snapshot.notes : []),
    [snapshot, key],
  );
  const index = useMemo(() => knowledgeIndex(notes), [notes]);
  return (
    <Context.Provider
      value={{
        notes,
        index,
        ready: enabled && snapshot?.key === key && !snapshot.error,
        loading: enabled && snapshot?.key !== key,
        error: snapshot?.key === key ? snapshot.error : "",
        ensure,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useKnowledge = () => useContext(Context);
