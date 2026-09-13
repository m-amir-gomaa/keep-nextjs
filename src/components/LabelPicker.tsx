"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';

interface Label { id: string; name: string; }

interface LabelPickerProps {
  selectedLabelIds: string[];
  onLabelsChange: (labelIds: string[]) => void;
}

export function LabelPicker({ selectedLabelIds, onLabelsChange }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/labels')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLabels(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const toggle = (id: string) => {
    if (selectedLabelIds.includes(id)) {
      onLabelsChange(selectedLabelIds.filter(l => l !== id));
    } else {
      onLabelsChange([...selectedLabelIds, id]);
    }
  };

  const filtered = labels.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={containerRef} className="relative" style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn w-8 h-8"
        aria-label="Add labels"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >
        <Icons.Label className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-xl z-[200]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">Label note</p>
            <input
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] outline-none mb-2"
              placeholder="Search labels..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
              {filtered.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] px-1 py-2 text-center">No labels found</p>
              ) : filtered.map(label => (
                <label
                  key={label.id}
                  className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover:bg-[var(--hover-main)] text-sm text-[var(--text-primary)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.includes(label.id)}
                    onChange={() => toggle(label.id)}
                    className="accent-[var(--accent)] w-3.5 h-3.5"
                  />
                  <span className="truncate">{label.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
