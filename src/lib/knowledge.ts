import type { WikiReference } from "./wiki-links";
export type KnowledgeNote = {
  id: string;
  title: string;
  archived: boolean;
  labels: { id: string; name: string }[];
  references: WikiReference[];
  linksTruncated: boolean;
};
export const noteTitle = (note: { title: string }) => note.title || "Untitled";
const titleKey = (title: string) =>
  title.normalize("NFKC").trim().toLowerCase();
export function knowledgeIndex(notes: KnowledgeNote[]) {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const byTitle = new Map<string, KnowledgeNote[]>();
  for (const note of notes) {
    if (!note.title.trim()) continue;
    const key = titleKey(note.title);
    byTitle.set(key, [...(byTitle.get(key) || []), note]);
  }
  return { byId, byTitle };
}
export type KnowledgeIndex = ReturnType<typeof knowledgeIndex>;
export function resolveWiki(target: string, index: KnowledgeIndex) {
  const matches = target.startsWith("note:")
    ? ([index.byId.get(target.slice(5))].filter(Boolean) as KnowledgeNote[])
    : index.byTitle.get(titleKey(target)) || [];
  return matches.length === 1
    ? { status: "resolved" as const, note: matches[0], count: 1 }
    : {
        status: matches.length ? ("ambiguous" as const) : ("missing" as const),
        count: matches.length,
      };
}
export const noteHref = (id: string) =>
  "/dashboard/note/" + encodeURIComponent(id);
export function connectionEdges(notes: KnowledgeNote[]) {
  const index = knowledgeIndex(notes),
    seen = new Set<string>();
  const edges: { source: string; target: string }[] = [];
  for (const note of notes)
    for (const reference of note.references) {
      const resolved = resolveWiki(reference.target, index);
      if (resolved.status !== "resolved" || resolved.note.id === note.id)
        continue;
      const key = JSON.stringify([note.id, resolved.note.id]);
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: note.id, target: resolved.note.id });
      }
    }
  return edges;
}

export function graphSlice(
  notes: KnowledgeNote[],
  options: {
    query?: string;
    label?: string;
    archived?: boolean;
    focus?: string;
    limit?: number;
  } = {},
) {
  const query = titleKey(options.query || "");
  const edges = connectionEdges(notes);
  const neighbours = new Set(
    options.focus
      ? [
          options.focus,
          ...edges
            .filter(
              (edge) =>
                edge.source === options.focus || edge.target === options.focus,
            )
            .flatMap((edge) => [edge.source, edge.target]),
        ]
      : [],
  );
  const filtered = notes
    .filter(
      (note) =>
        (options.archived !== false || !note.archived) &&
        (!query ||
          titleKey(
            [note.title, ...note.labels.map((label) => label.name)].join(" "),
          ).includes(query)) &&
        (!options.label ||
          note.labels.some((label) => label.id === options.label)) &&
        (!options.focus || neighbours.has(note.id)),
    )
    .sort(
      (a, b) =>
        noteTitle(a).localeCompare(noteTitle(b)) || a.id.localeCompare(b.id),
    );
  const visible = filtered.slice(
    0,
    Math.max(1, Math.min(500, options.limit || 250)),
  );
  const ids = new Set(visible.map((note) => note.id));
  const included = edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  return {
    notes: visible,
    edges: included.slice(0, 1000),
    totalNotes: filtered.length,
    totalEdges: included.length,
    truncated: visible.length < filtered.length || included.length > 1000,
  };
}

// Deterministic, bounded layout; no continuous simulation or client tracking.
export function layoutGraph(
  notes: { id: string }[],
  edges: { source: string; target: string }[],
) {
  if (notes.length === 1) return [{ id: notes[0].id, x: 500, y: 325 }];
  const positions = notes.map((note, i) => ({
    id: note.id,
    x:
      500 +
      Math.cos(i * 2.399963) *
        Math.sqrt((i + 1) / Math.max(1, notes.length)) *
        380,
    y:
      325 +
      Math.sin(i * 2.399963) *
        Math.sqrt((i + 1) / Math.max(1, notes.length)) *
        240,
  }));
  const byId = new Map(positions.map((point, i) => [point.id, i]));
  for (let step = 0; step < 64; step++) {
    const forces = positions.map((point) => ({
      x: (500 - point.x) * 0.005,
      y: (325 - point.y) * 0.005,
    }));
    for (let i = 0; i < positions.length; i++)
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x,
          dy = positions[i].y - positions[j].y,
          distance = Math.max(16, Math.hypot(dx, dy)),
          force = 900 / (distance * distance);
        forces[i].x += (dx / distance) * force;
        forces[i].y += (dy / distance) * force;
        forces[j].x -= (dx / distance) * force;
        forces[j].y -= (dy / distance) * force;
      }
    for (const edge of edges) {
      const i = byId.get(edge.source),
        j = byId.get(edge.target);
      if (i === undefined || j === undefined) continue;
      const dx = positions[j].x - positions[i].x,
        dy = positions[j].y - positions[i].y,
        distance = Math.max(1, Math.hypot(dx, dy)),
        force = (distance - 100) * 0.015;
      forces[i].x += (dx / distance) * force;
      forces[i].y += (dy / distance) * force;
      forces[j].x -= (dx / distance) * force;
      forces[j].y -= (dy / distance) * force;
    }
    positions.forEach((point, i) => {
      point.x = Math.max(
        60,
        Math.min(940, point.x + Math.max(-8, Math.min(8, forces[i].x))),
      );
      point.y = Math.max(
        50,
        Math.min(600, point.y + Math.max(-8, Math.min(8, forces[i].y))),
      );
    });
  }
  return positions;
}

export function fitGraph(
  points: { x: number; y: number }[],
  width: number,
  height: number,
) {
  if (!points.length) return { x: 500, y: 325, zoom: 1 };
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y);
  const left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  const margin = Math.min(120, width * 0.25);
  const scale = Math.min(
    (width - margin * 2) / Math.max(100, right - left),
    (height - 120) / Math.max(100, bottom - top),
  );
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    zoom: Math.max(0.25, Math.min(8, (scale * 1000) / width)),
  };
}
