import type { Note, ListItem } from '../types/index';

export function parseListItems(value: unknown): ListItem[] {
  let items = value;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { return []; }
  }
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && typeof item.text === 'string' && typeof item.isDone === 'boolean')
    .map(({ text, isDone }) => ({ text, isDone }));
}

export function noteMatchesQuery(note: Note, query: string): boolean {
  const search = query.trim().toLocaleLowerCase();
  if (!search) return true;
  return [note.title, note.body, ...(note.labels || []).map(label => label.name),
    ...parseListItems(note.listItems).map(item => item.text)]
    .some(text => text.toLocaleLowerCase().includes(search));
}
