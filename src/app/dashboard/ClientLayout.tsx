"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { DashboardSearchProvider } from "@/components/DashboardSearchContext";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { KnowledgeProvider } from "@/components/KnowledgeContext";

function Shell({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setOpen] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const { labels, labelError, refresh, refreshing, canLeave } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!mobile || !isSidebarOpen) return;
    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLAnchorElement>("#workspace-navigation a")
        ?.focus(),
    );
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document
          .querySelector<HTMLButtonElement>(
            '[aria-controls="workspace-navigation"]',
          )
          ?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", escape);
    };
  }, [mobile, isSidebarOpen]);
  useEffect(() => {
    const media = matchMedia("(min-width: 900px)");
    const change = () => {
      setMobile(!media.matches);
      setOpen(media.matches);
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const logout = async () => {
    if (signingOut || !canLeave()) return;
    setSigningOut(true);
    setError("");
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
      router.refresh();
    } catch {
      setError("Sign out did not finish. Check your connection and retry.");
      setSigningOut(false);
    }
  };
  return (
    <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[var(--bg-main)]">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[var(--surface-overlay)] focus:p-3"
      >
        Skip to notes
      </a>
      <Header
        toggleSidebar={() => setOpen((v) => !v)}
        sidebarOpen={isSidebarOpen}
        searchable={
          ![
            "/dashboard/edit-labels",
            "/dashboard/account",
            "/dashboard/graph",
          ].includes(pathname) && !pathname.startsWith("/dashboard/note/")
        }
        onRefresh={() => {
          if (canLeave()) refresh();
        }}
        refreshing={refreshing}
        onSignOut={logout}
        signingOut={signingOut}
      />
      {(labelError || error) && (
        <div
          role="alert"
          className="shrink-0 border-b border-[var(--border)] px-4 py-2 text-sm text-red-300"
        >
          {error || labelError}{" "}
          {labelError && (
            <button type="button" className="underline" onClick={refresh}>
              Retry loading labels
            </button>
          )}
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {mobile && isSidebarOpen && (
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <Sidebar
          isOpen={isSidebarOpen}
          mobile={mobile}
          labels={labels}
          onNavigate={() => {
            if (mobile) setOpen(false);
          }}
        />
        <main
          id="workspace-main"
          tabIndex={-1}
          inert={mobile && isSidebarOpen}
          className="min-w-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <KnowledgeProvider>
        <DashboardSearchProvider>
          <Shell>{children}</Shell>
        </DashboardSearchProvider>
      </KnowledgeProvider>
    </WorkspaceProvider>
  );
}
