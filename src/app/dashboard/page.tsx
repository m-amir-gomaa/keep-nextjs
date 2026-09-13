"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { TakeNote } from '@/components/TakeNote';
import { NoteCard } from '@/components/NoteCard';

export default function DashboardPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const filtered = notes.filter(n => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.body?.toLowerCase().includes(q) ||
      (n.labels || []).some((l: any) => l.name?.toLowerCase().includes(q))
    );
  });

  const pinnedNotes = filtered.filter(n => n.pinned);
  const otherNotes = filtered.filter(n => !n.pinned);

  return (
    <div className="max-w-[1200px] mx-auto px-4 pb-16">
      <TakeNote onNoteAdded={fetchNotes} />

      {/* Search bar */}
      {notes.length > 0 && (
        <div className="max-w-[600px] mx-auto mb-6 -mt-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
            <input
              type="text"
              placeholder="Search notes, labels..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-12 text-[var(--text-muted)]">Loading notes...</div>
      ) : (
        <div className="mt-4 space-y-8">
          {pinnedNotes.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 ml-2">Pinned</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onUpdate={fetchNotes} />
                ))}
              </div>
            </section>
          )}

          {otherNotes.length > 0 && (
            <section>
              {pinnedNotes.length > 0 && (
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 ml-2">Others</h4>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {otherNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onUpdate={fetchNotes} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && notes.length > 0 && query && (
            <div className="flex flex-col items-center justify-center mt-20 text-center opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" height="80" viewBox="0 -960 960 960" width="80" className="text-[var(--text-muted)] mb-4"><path fill="currentColor" d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
              <h2 className="text-lg font-medium text-[var(--text-secondary)]">No notes match &ldquo;{query}&rdquo;</h2>
            </div>
          )}

          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 text-center opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" height="120" viewBox="0 -960 960 960" width="120" className="text-[var(--text-muted)] mb-4"><path fill="currentColor" d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>
              <h2 className="text-xl font-medium text-[var(--text-secondary)]">Notes you add appear here</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
