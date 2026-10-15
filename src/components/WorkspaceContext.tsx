"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Label } from "@/types";
import { requestJSON } from "@/lib/client-api";

type Workspace = {
  labels: Label[];
  labelError: string;
  refreshing: boolean;
  version: number;
  refresh: () => void;
  putLabel: (label: Label) => void;
  removeLabel: (id: string) => void;
  setDraft: (id: string, dirty: boolean) => void;
  canLeave: () => boolean;
};
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [failure, setFailure] = useState<{
    version: number;
    message: string;
  } | null>(null);
  const [settledVersion, setSettledVersion] = useState(-1);
  const [version, setVersion] = useState(0);
  const sequence = useRef(0);
  const drafts = useRef(new Set<string>());
  const router = useRouter();
  const refreshing = settledVersion !== version;
  const labelError = failure?.version === version ? failure.message : "";
  const refresh = useCallback(() => {
    sequence.current++;
    setVersion((v) => v + 1);
  }, []);
  const setDraft = useCallback((id: string, dirty: boolean) => {
    if (dirty) drafts.current.add(id);
    else drafts.current.delete(id);
  }, []);
  const canLeave = useCallback(() => {
    if (!drafts.current.size) return true;
    if (
      !window.confirm(
        "You have unsaved changes. Leave and discard those changes?",
      )
    )
      return false;
    // Unmount cleanup removes drafts after a successful navigation. Keep the
    // guard if navigation/sign-out fails and the editor remains on screen.
    return true;
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    const controller = new AbortController();
    requestJSON<Label[]>("/api/labels", { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Labels could not be read.");
        if (sequence.current === id) setLabels(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted && sequence.current === id)
          setFailure({ version, message: e.message });
      })
      .finally(() => {
        if (sequence.current === id) setSettledVersion(version);
      });
    return () => controller.abort();
  }, [version]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (drafts.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigate = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        (anchor.pathname === location.pathname &&
          anchor.search === location.search) ||
        !drafts.current.size
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      if (canLeave()) {
        drafts.current.clear();
        if (anchor.origin === location.origin)
          router.push(anchor.pathname + anchor.search + anchor.hash);
        else location.assign(anchor.href);
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [canLeave, router]);
  const putLabel = useCallback(
    (label: Label) => {
      setLabels((old) =>
        [...old.filter((v) => v.id !== label.id), label].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      refresh();
    },
    [refresh],
  );
  const removeLabel = useCallback(
    (id: string) => {
      setLabels((old) => old.filter((v) => v.id !== id));
      refresh();
    },
    [refresh],
  );
  return (
    <Context.Provider
      value={{
        labels,
        labelError,
        refreshing,
        version,
        refresh,
        putLabel,
        removeLabel,
        setDraft,
        canLeave,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("WorkspaceProvider is required.");
  return context;
}
export function useDraftGuard(dirty: boolean) {
  const id = useId();
  const { setDraft } = useWorkspace();
  useEffect(() => {
    setDraft(id, dirty);
    return () => setDraft(id, false);
  }, [id, dirty, setDraft]);
}
