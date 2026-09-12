"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { NoteCard } from '@/components/NoteCard';

export default function TrashPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes/trash');
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

  const emptyTrash = async () => {
    try {
      await fetch('/api/notes/trash', { method: 'DELETE' });
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 pb-16 pt-8">
      {notes.length > 0 && (
        <div className="flex justify-center mb-8">
          <button 
            onClick={emptyTrash}
            className="text-blue-400 hover:text-blue-300 font-medium px-4 py-2"
          >
            Empty Trash
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-12 text-[var(--text-muted)]">Loading trash...</div>
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
              <svg xmlns="http://www.w3.org/2000/svg" height="120" viewBox="0 -960 960 960" width="120" className="text-[var(--text-muted)] mb-4"><path fill="currentColor" d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
              <h2 className="text-xl font-medium text-[var(--text-secondary)]">No notes in Trash</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
