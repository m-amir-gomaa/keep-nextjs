/** Treat malformed JSON and invalid names as client errors before database access. */
export async function readLabelName(request: { json(): Promise<unknown> }): Promise<string | null> {
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('name' in value)) return null;
    if (typeof value.name !== 'string') return null;
    const name = value.name.trim();
    return name.length > 0 && name.length <= 100 ? name : null;
  } catch {
    return null;
  }
}

export function parseLabelName(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const fields = value as Record<string, unknown>;
  if (Object.keys(fields).length !== 1 || typeof fields.name !== 'string') return null;
  const name = fields.name.trim();
  return name.length > 0 && name.length <= 100 ? name : null;
}
