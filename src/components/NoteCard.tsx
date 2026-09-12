"use client";
import React, { useState } from 'react';
import { Icons } from './Icons';

export function NoteCard({ note, onUpdate }: { note: any, onUpdate: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !note.pinned })
    });
    onUpdate();
  };

  const archiveNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !note.archived })
    });
    onUpdate();
  };

  const deleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleted: true })
    });
    onUpdate();
  };

  return (
    <div 
      className="group relative bg-[var(--surface-main)] hover:bg-[var(--surface-main)] rounded-xl border border-[var(--border)] p-4 transition-all hover:shadow-md min-h-[120px] flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin Button */}
      <div 
        className={`absolute top-2 right-2 transition-opacity duration-200 ${isHovered || note.pinned ? 'opacity-100' : 'opacity-0'}`}
      >
        <button 
          className="icon-btn bg-[var(--surface-overlay)] border border-[var(--border)] shadow-sm w-8 h-8" 
          onClick={togglePin}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
        >
          {note.pinned ? <Icons.PinFilled className="w-5 h-5 text-[var(--accent)]" /> : <Icons.Pin className="w-5 h-5" />}
        </button>
      </div>

      {note.title && (
        <h3 className="font-medium text-[16px] text-[var(--text-primary)] mb-3 pr-8 whitespace-pre-wrap">{note.title}</h3>
      )}
      
      {note.body && (
        <div className="text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap flex-1">{note.body}</div>
      )}

      {/* Action Bar */}
      <div className={`flex items-center gap-2 mt-4 -ml-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button className="icon-btn w-8 h-8" aria-label="Remind me"><Icons.Reminders className="w-4 h-4" /></button>
        <button className="icon-btn w-8 h-8" onClick={archiveNote} aria-label={note.archived ? "Unarchive" : "Archive"}><Icons.Archive className="w-4 h-4" /></button>
        <button className="icon-btn w-8 h-8" onClick={deleteNote} aria-label="Delete note"><Icons.Trash className="w-4 h-4" /></button>
        <button className="icon-btn w-8 h-8 ml-auto" aria-label="More"><Icons.Menu className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
