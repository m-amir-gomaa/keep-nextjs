"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Note } from "@/types";
import { requestJSON } from "@/lib/client-api";
import { useWorkspace } from "./WorkspaceContext";

type Snapshot = { key: string; path: string; notes: Note[]; error: string };
export function useNotes(path: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [localVersion, setVersion] = useState(0);
  const { version } = useWorkspace();
  const sequence = useRef(0);
  const key = path + ":" + version + ":" + localVersion;
  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    const controller = new AbortController();
    requestJSON<Note[]>(path, { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data))
          throw new Error("The note list could not be read.");
        if (sequence.current === id)
          setSnapshot({ key, path, notes: data, error: "" });
      })
      .catch((e) => {
        if (!controller.signal.aborted && sequence.current === id)
          setSnapshot((old) => ({
            key,
            path,
            notes: old?.path === path ? old.notes : [],
            error: e.message,
          }));
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    notes: snapshot?.path === path ? snapshot.notes : [],
    loading: snapshot?.key !== key,
    error: snapshot?.key === key ? snapshot.error : "",
    reload,
  };
}
