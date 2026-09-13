"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { NoteCard } from '@/components/NoteCard';
import { use } from 'react';

export default function LabelPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((n: any) =>
          (n.labels || []).some((l: any) => l.name === decodedName)
        );
        setNotes(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [decodedName]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const pinnedNotes = notes.filter(n => n.pinned);
  const otherNotes = notes.filter(n => !n.pinned);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 pb-16">
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M840-480 666-234q-11 16-28.5 25t-37.5 9H200q-33 0-56.5-23.5T120-280v-400q0-33 23.5-56.5T200-760h400q20 0 37.5 9t28.5 25l174 246Zm-98 0L600-680H200v400h400l142-200Zm-542 0v200-400 200Z"/></svg>
        {decodedName}
      </h2>

      {loading ? (
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" height="80" viewBox="0 -960 960 960" width="80" className="text-[var(--text-muted)] mb-4"><path fill="currentColor" d="M840-480 666-234q-11 16-28.5 25t-37.5 9H200q-33 0-56.5-23.5T120-280v-400q0-33 23.5-56.5T200-760h400q20 0 37.5 9t28.5 25l174 246Zm-98 0L600-680H200v400h400l142-200Zm-542 0v200-400 200Z"/></svg>
          <h2 className="text-lg font-medium text-[var(--text-secondary)]">No notes with label &ldquo;{decodedName}&rdquo;</h2>
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedNotes.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 ml-2">Pinned</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pinnedNotes.map(n => <NoteCard key={n.id} note={n} onUpdate={fetchNotes} />)}
              </div>
            </section>
          )}
          {otherNotes.length > 0 && (
            <section>
              {pinnedNotes.length > 0 && (
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 ml-2">Others</h4>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {otherNotes.map(n => <NoteCard key={n.id} note={n} onUpdate={fetchNotes} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
