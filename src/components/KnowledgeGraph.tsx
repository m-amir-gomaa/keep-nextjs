"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  graphSlice,
  fitGraph,
  layoutGraph,
  noteHref,
  noteTitle,
  type KnowledgeNote,
} from "@/lib/knowledge";

export function KnowledgeGraph({
  notes,
  hrefFor = noteHref,
}: {
  notes: KnowledgeNote[];
  hrefFor?: (id: string) => string;
}) {
  const [query, setQuery] = useState(""),
    [label, setLabel] = useState(""),
    [focus, setFocus] = useState(""),
    [archives, setArchives] = useState(true),
    [limit, setLimit] = useState(250);
  const [manualCamera, setCamera] = useState<{
    x: number;
    y: number;
    zoom: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 580 });
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svg.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      if (box.width && box.height)
        setSize((previous) =>
          previous.width === box.width && previous.height === box.height
            ? previous
            : { width: box.width, height: box.height },
        );
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    zoom: number;
  } | null>(null);
  const marker = useId().replaceAll(":", "");
  const graph = useMemo(
    () => graphSlice(notes, { query, label, focus, archived: archives, limit }),
    [notes, query, label, focus, archives, limit],
  );
  const points = useMemo(
    () =>
      new Map(
        layoutGraph(graph.notes, graph.edges).map((point) => [point.id, point]),
      ),
    [graph.notes, graph.edges],
  );
  const labels = useMemo(
    () =>
      [
        ...new Map(
          notes.flatMap((note) => note.labels).map((item) => [item.id, item]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [notes],
  );
  const selected = notes.find((note) => note.id === focus);
  const fitted = useMemo(
    () => fitGraph([...points.values()], size.width, size.height),
    [points, size],
  );
  const camera = manualCamera || fitted;
  const baseHeight = (1000 * size.height) / size.width;
  const unit = 1000 / camera.zoom / size.width;
  const zoom = (factor: number) =>
    setCamera((previous) => ({
      ...(previous || fitted),
      zoom: Math.max(0.25, Math.min(12, (previous || fitted).zoom * factor)),
    }));
  const pan = (x: number, y: number) =>
    setCamera((previous) => ({
      ...(previous || fitted),
      x: (previous || fitted).x + x / (previous || fitted).zoom,
      y: (previous || fitted).y + y / (previous || fitted).zoom,
    }));
  function focusNote(id: string) {
    setFocus(id);
    setCamera(null);
  }
  return (
    <section className="knowledge-graph" aria-label="Note graph">
      <div className="graph-filters">
        <label>
          Filter titles or labels
          <input
            aria-label="Filter graph"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCamera(null);
            }}
            placeholder="Find a connection…"
          />
        </label>
        <label>
          Label
          <select
            aria-label="Graph label"
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
              setCamera(null);
            }}
          >
            <option value="">All labels</option>
            {labels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Focus
          <select
            aria-label="Focus note"
            value={focus}
            onChange={(event) => focusNote(event.target.value)}
          >
            <option value="">All notes</option>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>
                {noteTitle(note)} · {note.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Node limit
          <select
            aria-label="Graph node limit"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setCamera(null);
            }}
          >
            {[100, 250, 500].map((count) => (
              <option key={count}>{count}</option>
            ))}
          </select>
        </label>
        <label className="graph-checkbox">
          <input
            type="checkbox"
            checked={archives}
            onChange={(event) => {
              setArchives(event.target.checked);
              setCamera(null);
            }}
          />{" "}
          Include archive
        </label>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setLabel("");
            setFocus("");
            setArchives(true);
            setLimit(250);
            setCamera(null);
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="graph-caption">
        <p role="status">
          {graph.notes.length} of {graph.totalNotes} matching notes ·{" "}
          {graph.edges.length} connections
          {graph.truncated ? " · view limited" : ""}
        </p>
        {selected && (
          <a href={hrefFor(selected.id)} className="graph-open">
            Open {noteTitle(selected)} ↗
          </a>
        )}
      </div>
      <div className="graph-canvas">
        {!graph.notes.length && (
          <p className="graph-empty">
            {notes.length
              ? "No notes match these filters. Try resetting them."
              : "Your graph is empty. Create a note, then use Link note to connect it."}
          </p>
        )}
        <svg
          ref={svg}
          role="img"
          aria-label="Connections between notes; use the focus selector or note list for keyboard navigation"
          viewBox={`${camera.x - 500 / camera.zoom} ${camera.y - baseHeight / 2 / camera.zoom} ${1000 / camera.zoom} ${baseHeight / camera.zoom}`}
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            const box = event.currentTarget.getBoundingClientRect();
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              startX: camera.x,
              startY: camera.y,
              width: box.width,
              height: box.height,
              zoom: camera.zoom,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (start)
              setCamera({
                zoom: start.zoom,
                x:
                  start.startX -
                  (((event.clientX - start.x) / start.width) * 1000) /
                    start.zoom,
                y:
                  start.startY -
                  (((event.clientY - start.y) / start.height) * baseHeight) /
                    start.zoom,
              });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <marker
              id={marker}
              markerWidth={8 * unit}
              markerHeight={8 * unit}
              refX="17"
              viewBox="0 0 8 8"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0 1 L6 4 L0 7" fill="none" stroke="currentColor" />
            </marker>
          </defs>
          <g className="graph-edges">
            {graph.edges.map((edge) => {
              const from = points.get(edge.source)!,
                to = points.get(edge.target)!;
              return (
                <line
                  key={edge.source + ":" + edge.target}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  markerEnd={`url(#${marker})`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
          {graph.notes.map((note) => {
            const point = points.get(note.id)!;
            return (
              <g
                key={note.id}
                className={
                  "graph-node" +
                  (focus === note.id ? " selected" : "") +
                  (note.archived ? " archived" : "")
                }
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => focusNote(note.id)}
                aria-hidden="true"
              >
                <title>{noteTitle(note)}</title>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={(focus === note.id ? 11 : 8) * unit}
                  style={{ strokeWidth: 1.5 * unit }}
                />
                <text
                  x={point.x}
                  y={point.y + 23 * unit}
                  textAnchor="middle"
                  style={{ fontSize: 12 * unit, strokeWidth: 3 * unit }}
                >
                  {noteTitle(note).length > 26
                    ? noteTitle(note).slice(0, 25) + "…"
                    : noteTitle(note)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="graph-camera" role="group" aria-label="Graph camera">
          <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setCamera(null)}>
            Fit graph
          </button>
          <button
            type="button"
            onClick={() => pan(-100, 0)}
            aria-label="Pan left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => pan(100, 0)}
            aria-label="Pan right"
          >
            →
          </button>
          <button type="button" onClick={() => pan(0, -80)} aria-label="Pan up">
            ↑
          </button>
          <button
            type="button"
            onClick={() => pan(0, 80)}
            aria-label="Pan down"
          >
            ↓
          </button>
        </div>
      </div>
      <p className="graph-help">
        Choose a node to focus its neighbours. Drag the background with a mouse,
        or use the camera buttons. Arrows follow links; archive nodes have an
        outline. Filters intersect. Connections use saved notes.
      </p>
      {(graph.truncated || notes.some((note) => note.linksTruncated)) && (
        <p role="status" className="graph-warning">
          The view is bounded to 500 nodes and 1,000 edges; each note
          contributes at most 256 wiki references. Filter or focus to inspect a
          smaller set. Your source is unchanged.
        </p>
      )}
      <details className="graph-note-list" open>
        <summary>Note list · keyboard navigation</summary>
        <ul>
          {graph.notes.map((note) => (
            <li key={note.id}>
              <a href={hrefFor(note.id)}>
                {noteTitle(note)}
                {note.archived ? " · archived" : ""}
              </a>
              <button
                type="button"
                aria-label={"Focus " + noteTitle(note)}
                onClick={() => focusNote(note.id)}
              >
                Focus
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
