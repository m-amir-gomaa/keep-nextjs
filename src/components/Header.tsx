"use client";
import Link from "next/link";
import { Icons } from "./Icons";
import { useDashboardSearch } from "./DashboardSearchContext";

type Props = {
  toggleSidebar: () => void;
  sidebarOpen?: boolean;
  searchable?: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
  onSignOut: () => void;
  signingOut?: boolean;
};
export function Header({
  toggleSidebar,
  sidebarOpen,
  searchable = true,
  onRefresh,
  refreshing,
  onSignOut,
  signingOut,
}: Props) {
  const { query, setQuery } = useDashboardSearch();
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="icon-btn"
          aria-label="Main menu"
          aria-expanded={sidebarOpen}
          aria-controls="workspace-navigation"
        >
          <Icons.Menu />
        </button>
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight"
        >
          Noteweld<span className="sr-only"> home</span>
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:order-3">
        <button
          type="button"
          className="icon-btn"
          aria-label="Refresh notes and labels"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <Icons.Refresh />
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--hover-main)]"
          onClick={onSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {searchable && (
        <div className="flex min-w-0 basis-full items-center gap-2 rounded-xl bg-[var(--surface-main)] px-3 py-1 sm:order-2 sm:ml-6 sm:basis-0 sm:flex-1 sm:max-w-[720px]">
          <span
            aria-hidden="true"
            className="shrink-0 text-[var(--text-muted)]"
          >
            <Icons.Search />
          </span>
          <input
            type="search"
            className="input-ghost h-10 min-w-0 flex-1"
            placeholder="Search notes…"
            aria-label="Search notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <Icons.Clear />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
