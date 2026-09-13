"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { ColorPicker } from './ColorPicker';
import { LabelPicker } from './LabelPicker';

interface Label { id: string; name: string; }

export function NoteCard({ note, onUpdate }: { note: any, onUpdate: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body);
  const [editColor, setEditColor] = useState(note.color || '');
  const [editLabelIds, setEditLabelIds] = useState<string[]>(
    (note.labels || []).map((l: Label) => l.id)
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditColor(note.color || '');
    setEditLabelIds((note.labels || []).map((l: Label) => l.id));
  }, [note]);

  useEffect(() => {
    isDirtyRef.current = (
      editTitle !== note.title ||
      editBody !== note.body ||
      editColor !== (note.color || '') ||
      JSON.stringify(editLabelIds) !== JSON.stringify((note.labels || []).map((l: Label) => l.id))
    );
  }, [editTitle, editBody, editColor, editLabelIds, note]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isEditing && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        saveAndClose();
      }
    }
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editTitle, editBody, editColor, editLabelIds]);

  const saveAndClose = async () => {
    if (isDirtyRef.current) {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          color: editColor,
          labelIds: editLabelIds,
        })
      });
      onUpdate();
    }
    setIsEditing(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button, .label-picker-container')) return;
    setIsEditing(true);
  };

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

  const labels: Label[] = note.labels || [];

  const cardBg = note.color || 'var(--surface-main)';
  const modalBg = editColor || 'var(--surface-main)';

  const modalContent = isEditing ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={modalRef}
        style={{ backgroundColor: modalBg }}
        className="w-full max-w-[600px] rounded-xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col p-4 pb-2">
          <input
            type="text"
            className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] font-medium text-base mb-3 placeholder:text-[var(--text-muted)]"
            placeholder="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] resize-none min-h-[100px]"
            placeholder="Note"
            value={editBody}
            onChange={(e) => {
              setEditBody(e.target.value);
              e.target.style.height = 'inherit';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </div>

        {/* Label chips inside modal */}
        {editLabelIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {(note.labels || [])
              .filter((l: Label) => editLabelIds.includes(l.id))
              .map((l: Label) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 text-[11px] bg-[rgba(0,0,0,0.12)] rounded-full px-3 py-0.5 border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  {l.name}
                </span>
              ))}
          </div>
        )}

        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <button className="icon-btn w-8 h-8"><Icons.Reminders className="w-5 h-5"/></button>
            <button className="icon-btn w-8 h-8" onClick={archiveNote}><Icons.Archive className="w-5 h-5"/></button>
            <div className="label-picker-container">
              <LabelPicker selectedLabelIds={editLabelIds} onLabelsChange={setEditLabelIds} />
            </div>
            <ColorPicker currentColor={editColor} onColorSelect={setEditColor} />
          </div>
          <button
            onClick={saveAndClose}
            className="px-6 py-2 text-sm font-medium hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-colors text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {isEditing && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
      <div
        style={{ backgroundColor: cardBg }}
        className="group relative hover:brightness-110 rounded-xl border border-[var(--border)] p-4 transition-all hover:shadow-md min-h-[120px] flex flex-col cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Pin Button */}
        <div className={`absolute top-2 right-2 transition-opacity duration-200 ${isHovered || note.pinned ? 'opacity-100' : 'opacity-0'}`}>
          <button
            className="icon-btn bg-[var(--surface-overlay)] border border-[var(--border)] shadow-sm w-8 h-8"
            onClick={togglePin}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            {note.pinned ? <Icons.PinFilled className="w-5 h-5 text-[var(--accent)]" /> : <Icons.Pin className="w-5 h-5" />}
          </button>
        </div>

        {note.title && (
          <h3 className="font-medium text-[16px] text-[var(--text-primary)] mb-2 pr-8 whitespace-pre-wrap">{note.title}</h3>
        )}

        {note.body && (
          <div className="text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap flex-1 leading-relaxed">{note.body}</div>
        )}

        {/* Label chips */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center text-[11px] bg-[rgba(0,0,0,0.12)] rounded-full px-3 py-0.5 border border-[var(--border)] text-[var(--text-secondary)]"
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className={`flex items-center gap-1 mt-3 -ml-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button className="icon-btn w-8 h-8" aria-label="Remind me"><Icons.Reminders className="w-4 h-4" /></button>
          <button className="icon-btn w-8 h-8" onClick={archiveNote} aria-label={note.archived ? 'Unarchive' : 'Archive'}><Icons.Archive className="w-4 h-4" /></button>
          <button className="icon-btn w-8 h-8" onClick={deleteNote} aria-label="Delete note"><Icons.Trash className="w-4 h-4" /></button>
          <div className="label-picker-container" onClick={e => e.stopPropagation()}>
            <LabelPicker
              selectedLabelIds={(note.labels || []).map((l: Label) => l.id)}
              onLabelsChange={async (labelIds) => {
                await fetch(`/api/notes/${note.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ labelIds })
                });
                onUpdate();
              }}
            />
          </div>
          <ColorPicker currentColor={note.color} onColorSelect={async (c) => {
            await fetch(`/api/notes/${note.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ color: c })
            });
            onUpdate();
          }} />
          <button className="icon-btn w-8 h-8 ml-auto" aria-label="More"><Icons.Menu className="w-4 h-4" /></button>
        </div>
      </div>
    </>
  );
}
