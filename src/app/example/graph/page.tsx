import Link from "next/link";
import { GraphExample } from "@/components/GraphExample";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Explore connected notes — Noteweld",
};
export default function GraphExamplePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <nav
        className="mb-10 flex flex-wrap justify-between gap-4"
        aria-label="Example navigation"
      >
        <Link href="/example" className="underline">
          Try the editor
        </Link>
        <Link href="/auth/signin" className="underline">
          Open private workspace ↗
        </Link>
      </nav>
      <div className="mb-8 max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
          A trail through your ideas
        </p>
        <h1 className="text-3xl font-semibold sm:text-5xl">
          Notes are better connected.
        </h1>
        <p className="leading-7 text-[var(--text-secondary)]">
          Explore the real graph with six original example notes. Filter by
          label, focus a neighbourhood, or use the note list. This example needs
          no account and reads no private data.
        </p>
      </div>
      <GraphExample />
      <footer className="mt-12 border-t border-[var(--border)] py-6 text-sm">
        <Link href="/about" className="underline">
          Privacy and preview limits
        </Link>
      </footer>
    </main>
  );
}
