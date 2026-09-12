"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { NoteCard } from '@/components/NoteCard';

export default function ArchivePage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes/archive');
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

  return (
    <div className="max-w-[1200px] mx-auto px-4 pb-16 pt-8">
      {loading ? (
        <div className="flex justify-center mt-12 text-[var(--text-muted)]">Loading archive...</div>
      ) : (
        <div className="space-y-8">
          {notes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onUpdate={fetchNotes} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center mt-20 text-center opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" height="120" viewBox="0 -960 960 960" width="120" className="text-[var(--text-muted)] mb-4"><path fill="currentColor" d="m480-240 160-160-56-56-64 64v-168h-80v168l-64-64-56 56 160 160ZM200-640v440h560v-440H200Zm0 520q-33 0-56.5-23.5T120-200v-499q0-14 4.5-27t13.5-24l50-61q11-14 27.5-21.5T250-840h460q18 0 34.5 7.5T772-811l50 61q9 11 13.5 24t4.5 27v499q0 33-23.5 56.5T760-120H200Zm16-600h528l-34-40H250l-34 40Zm264 300Z"/></svg>
              <h2 className="text-xl font-medium text-[var(--text-secondary)]">Your archived notes appear here</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
