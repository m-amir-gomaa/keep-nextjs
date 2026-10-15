"use client";
export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-3 text-2xl">
        The workspace is temporarily unavailable
      </h1>
      <p className="mb-6">
        Your saved notes stay on the server. Retry this request when the
        connection recovers.
      </p>
      <button
        onClick={retry}
        className="rounded-lg bg-[var(--accent)] px-5 py-3 text-black"
      >
        Try again
      </button>
    </main>
  );
}
