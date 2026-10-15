import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function endpoint<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      // Driver errors can contain SQL, note text or connection details.
      console.error("Noteweld request failed", {
        type: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        { error: "The request could not be completed. Please retry." },
        { status: 503 },
      );
    }
  };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url,
  ).origin;
  if (origin !== expected)
    throw new ApiError(403, "Refresh this page before trying again.");
}

export async function readJSON(request: Request): Promise<unknown> {
  sameOrigin(request);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new ApiError(415, "Send a JSON request.");
  }
  const limit = 256 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new ApiError(413, "Request exceeds the supported size.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Expected a JSON request.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, "Request exceeds the supported size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Request must contain valid JSON.");
  }
}

export function uniqueConflict(error: unknown, constraint: string): boolean {
  const seen = new Set();
  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);
    const detail = error as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (detail.code === "23505" && detail.constraint === constraint)
      return true;
    error = detail.cause;
  }
  return false;
}
