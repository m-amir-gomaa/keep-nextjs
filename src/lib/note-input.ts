export interface ListItem {
  text: string;
  isDone: boolean;
}

export interface NoteInput {
  title?: string;
  body?: string;
  color?: string;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  isList?: boolean;
  listItems?: string;
  labelIds?: string[];
  expectedRevision?: number;
}

export class NoteInputError extends Error {}

// Build a new object: request data must never reach the database unchanged.
export function parseNoteInput(
  value: unknown,
  mode: "create" | "update",
): NoteInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NoteInputError("Expected a JSON object");
  }
  const input = value as Record<string, unknown>;
  const allowed = new Set([
    "title",
    "body",
    "color",
    "pinned",
    "isList",
    "listItems",
    "labelIds",
    ...(mode === "update" ? ["archived", "deleted", "expectedRevision"] : []),
  ]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key))
      throw new NoteInputError(`Unsupported field: ${key}`);
  }

  const result: NoteInput = {};
  for (const key of ["title", "body", "color"] as const) {
    if (key in input) {
      if (typeof input[key] !== "string")
        throw new NoteInputError(`${key} must be a string`);
      if (input[key].length > (key === "body" ? 100_000 : 200))
        throw new NoteInputError(`${key} exceeds the supported length`);
      result[key] = key === "title" ? input[key].trim() : input[key];
    }
  }
  if (mode === "update") {
    if (
      !Number.isInteger(input.expectedRevision) ||
      (input.expectedRevision as number) < 0 ||
      (input.expectedRevision as number) > 1_000_000_000
    ) {
      throw new NoteInputError(
        "Refresh the note before changing it; a valid revision is required.",
      );
    }
    result.expectedRevision = input.expectedRevision as number;
  }
  for (const key of ["pinned", "archived", "deleted", "isList"] as const) {
    if (key in input) {
      if (typeof input[key] !== "boolean")
        throw new NoteInputError(`${key} must be a boolean`);
      result[key] = input[key];
    }
  }
  if ("labelIds" in input) {
    if (
      !Array.isArray(input.labelIds) ||
      input.labelIds.length > 100 ||
      input.labelIds.some(
        (id) => typeof id !== "string" || !id.trim() || id.length > 100,
      )
    ) {
      throw new NoteInputError("labelIds must be an array of nonempty strings");
    }
    result.labelIds = [...new Set(input.labelIds as string[])];
  }
  if ("listItems" in input) {
    let items: unknown = input.listItems;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        throw new NoteInputError("listItems must contain valid JSON");
      }
    }
    if (
      !Array.isArray(items) ||
      items.length > 500 ||
      items.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          typeof item.text !== "string" ||
          item.text.length > 1000 ||
          typeof item.isDone !== "boolean",
      )
    ) {
      throw new NoteInputError(
        "listItems must be an array of text and isDone objects",
      );
    }
    result.listItems = JSON.stringify(
      items
        .map(({ text, isDone }: ListItem) => ({ text: text.trim(), isDone }))
        .filter((item) => item.text),
    );
  }
  if (
    mode === "create" &&
    !result.title &&
    !result.body?.trim() &&
    (!result.isList || !result.listItems || result.listItems === "[]")
  ) {
    throw new NoteInputError("Note cannot be empty");
  }
  if (mode === "update" && Object.keys(result).length === 1) {
    throw new NoteInputError("No note fields supplied");
  }
  return result;
}
