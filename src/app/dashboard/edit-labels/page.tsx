"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/Icons';

interface Label { id: string; name: string; }

export default function EditLabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLabels = useCallback(async () => {
    const res = await fetch('/api/labels');
    if (res.ok) {
      const data = await res.json();
      setLabels(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const createLabel = async () => {
    if (!newName.trim()) return;
    setError('');
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName('');
      fetchLabels();
    } else {
      const d = await res.json();
      setError(d.error || 'Error creating label');
    }
  };

  const updateLabel = async (id: string) => {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchLabels();
    }
  };

  const deleteLabel = async (id: string) => {
    await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    fetchLabels();
  };

  return (
    <div className="max-w-[480px] mx-auto px-4 py-10">
      <h1 className="text-xl font-medium text-[var(--text-primary)] mb-6">Edit labels</h1>

      {/* Create new */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 flex items-center bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-3 gap-2 focus-within:border-[var(--accent)] transition-colors">
          <Icons.Label className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Create new label"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createLabel()}
            className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          {newName && (
            <button onClick={() => setNewName('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
            </button>
          )}
        </div>
        <button
          onClick={createLabel}
          disabled={!newName.trim()}
          className="icon-btn w-10 h-10 bg-[var(--surface-main)] border border-[var(--border)] rounded-xl disabled:opacity-40 text-[var(--accent)]"
          aria-label="Create label"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      {loading ? (
        <p className="text-[var(--text-muted)] text-sm">Loading...</p>
      ) : labels.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No labels yet. Create one above!</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {labels.map(label => (
            <li
              key={label.id}
              className="flex items-center gap-2 bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-3 py-1 group hover:border-[rgba(255,255,255,0.12)] transition-colors"
            >
              <Icons.Label className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              {editingId === label.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') updateLabel(label.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-[var(--text-primary)]"
                    autoFocus
                  />
                  <button onClick={() => setEditingId(null)} className="icon-btn w-7 h-7 text-[var(--text-muted)]">
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                  </button>
                  <button onClick={() => updateLabel(label.id)} className="icon-btn w-7 h-7 text-[var(--accent)]">
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 py-2 text-sm text-[var(--text-primary)]">{label.name}</span>
                  <button
                    onClick={() => { setEditingId(label.id); setEditingName(label.name); }}
                    className="icon-btn w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)]"
                    aria-label="Edit label"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                  </button>
                  <button
                    onClick={() => deleteLabel(label.id)}
                    className="icon-btn w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-red-400"
                    aria-label="Delete label"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
