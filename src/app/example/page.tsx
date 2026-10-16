import Link from "next/link";
import { EditorDemo } from "@/components/EditorDemo";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Try the Markdown editor — Noteweld",
};

export default function ExamplePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <nav
        aria-label="Example navigation"
        className="mb-12 flex flex-wrap items-center justify-between gap-4"
      >
        <Link href="/" className="text-xl font-semibold">
          Noteweld<span className="text-[var(--accent)]">.</span>
        </Link>
        <Link href="/example/graph" className="text-sm underline">
          Explore connections
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Open private workspace ↗
        </Link>
      </nav>
      <div className="mb-8 max-w-2xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">
          The writing workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          A clear space for your next thought.
        </h1>
        <p className="text-base leading-7 text-[var(--text-secondary)]">
          Try the real Markdown editor. Write, preview, search, or switch to Vim
          keys. No account needed. This scratchpad lives only in this tab;
          download it before you leave.
        </p>
      </div>
      <EditorDemo />
      <footer className="mt-12 flex flex-wrap justify-between gap-4 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-muted)]">
        <Link href="/about" className="underline">
          Privacy and preview limits
        </Link>
        <a
          href="https://m-amir-gomaa.github.io/#projects"
          className="underline"
        >
          More work by Amir Gomaa ↗
        </a>
      </footer>
    </main>
  );
}
