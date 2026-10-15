export class AuthInputError extends Error {}

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export function parseCredentials(input: unknown): { email: string; password: string } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const { email, password } = input as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null;
  // bcrypt only uses the first 72 bytes. Never silently truncate a password.
  if (!password.length || byteLength(password) > 72) return null;
  return { email: normalizedEmail, password };
}

export function parseRegistration(input: unknown) {
  const credentials = parseCredentials(input);
  if (!credentials) throw new AuthInputError("Enter a valid email and a password of at most 72 UTF-8 bytes.");
  if (Array.from(credentials.password).length < 15) throw new AuthInputError("Use a passphrase with at least 15 characters.");
  const fields = input as Record<string, unknown>;
  if (Object.keys(fields).some(key => !["email", "password", "name"].includes(key))) {
    throw new AuthInputError("Unexpected registration field.");
  }
  if (fields.name !== undefined && (typeof fields.name !== "string" || fields.name.trim().length > 100)) {
    throw new AuthInputError("Name must be text with at most 100 characters.");
  }
  return { ...credentials, name: typeof fields.name === "string" ? fields.name.trim() || null : null };
}

export function isEmailConflict(error: unknown): boolean {
  const seen = new Set<unknown>();
  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);
    const detail = error as { code?: string; constraint?: string; cause?: unknown };
    if (detail.code === "23505" && ["user_email_unique", "user_email_normalized_unique"].includes(detail.constraint ?? "")) return true;
    error = detail.cause;
  }
  return false;
}
