export class ClientError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export async function requestJSON<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15_000);
  try {
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(path, {
      ...options,
      headers,
      credentials: "same-origin",
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new ClientError(
        typeof body?.error === "string"
          ? body.error
          : "The request failed. Please retry.",
        response.status,
      );
    if (body === null)
      throw new ClientError(
        "The server returned an unreadable response. Refresh before trying again.",
      );
    return body as T;
  } catch (error) {
    if (error instanceof ClientError) throw error;
    throw new ClientError(
      "The connection was interrupted. Your unsaved input is still here; check your connection and retry.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
