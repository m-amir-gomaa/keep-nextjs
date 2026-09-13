"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { ColorPicker } from './ColorPicker';
import { LabelPicker } from './LabelPicker';

export function TakeNote({ onNoteAdded }: { onNoteAdded: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAndSave();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, title, body, isPinned, color, labelIds]);

  const closeAndSave = async () => {
    if (isExpanded) {
      if (title.trim() || body.trim()) {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body, pinned: isPinned, color, labelIds })
        });
        onNoteAdded();
      }
      setTitle('');
      setBody('');
      setIsPinned(false);
      setColor('');
      setLabelIds([]);
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <div
        className="max-w-[600px] mx-auto my-8 bg-[var(--surface-main)] rounded-xl border border-[var(--border)] shadow-md flex items-center px-4 py-3 cursor-text hover:shadow-lg transition-shadow"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex-1 text-[var(--text-secondary)] font-medium">Take a note...</div>
        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
          <button className="hover:text-[var(--text-primary)]" aria-label="New list"><Icons.Check className="w-6 h-6" /></button>
          <button className="hover:text-[var(--text-primary)]" aria-label="New note with label"><Icons.Label className="w-6 h-6" /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: color || 'var(--surface-main)' }}
      className="max-w-[600px] mx-auto my-8 rounded-xl border border-[var(--border)] shadow-lg overflow-visible animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-start p-4 pb-2">
        <input
          type="text"
          className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-medium text-base placeholder:text-[var(--text-muted)]"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <button
          className="icon-btn shrink-0"
          onClick={() => setIsPinned(!isPinned)}
          aria-label={isPinned ? 'Unpin note' : 'Pin note'}
        >
          {isPinned ? <Icons.PinFilled /> : <Icons.Pin />}
        </button>
      </div>

      <div className="px-4 py-2">
        <textarea
          className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] resize-none"
          placeholder="Take a note..."
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            e.target.style.height = 'inherit';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          rows={Math.max(1, body.split('\n').length)}
        />
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <button className="icon-btn"><Icons.Reminders className="w-5 h-5"/></button>
          <div className="label-picker-container" onClick={e => e.stopPropagation()}>
            <LabelPicker selectedLabelIds={labelIds} onLabelsChange={setLabelIds} />
          </div>
          <ColorPicker currentColor={color} onColorSelect={setColor} />
        </div>
        <button
          onClick={closeAndSave}
          className="px-6 py-2 text-sm font-medium hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-colors text-[var(--text-primary)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
