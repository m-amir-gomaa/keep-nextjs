"use client";
import type { ListItem } from "@/types";

export function ChecklistEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, change: Partial<ListItem>) => {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  };
  return (
    <div
      className="flex flex-col gap-2 max-h-[400px] overflow-y-auto"
      aria-label="Checklist items"
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.isDone}
            disabled={disabled}
            aria-label={`Mark item ${index + 1} complete`}
            onChange={(event) =>
              update(index, { isDone: event.target.checked })
            }
          />
          <input
            type="text"
            value={item.text}
            placeholder="List item"
            disabled={disabled}
            aria-label={`Item ${index + 1}`}
            autoFocus={index === items.length - 1 && !item.text}
            className={`flex-1 min-w-0 bg-transparent outline-none text-sm ${item.isDone ? "line-through opacity-50" : ""}`}
            onChange={(event) => update(index, { text: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && item.text.trim()) {
                event.preventDefault();
                onChange([...items, { text: "", isDone: false }]);
              }
            }}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="px-2 text-[var(--text-muted)]"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        className="text-left text-sm py-2 text-[var(--text-secondary)]"
        onClick={() => onChange([...items, { text: "", isDone: false }])}
      >
        + Add item
      </button>
    </div>
  );
}
