"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { TakeNote } from '@/components/TakeNote';
import { NoteCard } from '@/components/NoteCard';

export default function DashboardPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const pinnedNotes = notes.filter(n => n.pinned);
  const otherNotes = notes.filter(n => !n.pinned);

  return (
    <div className="max-w-[1200px] mx-auto px-4 pb-16">
      <TakeNote onNoteAdded={fetchNotes} />
      
      {loading ? (
        <div className="flex justify-center mt-12 text-[var(--text-muted)]">Loading notes...</div>
      ) : (
        <div className="mt-8 space-y-8">
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
