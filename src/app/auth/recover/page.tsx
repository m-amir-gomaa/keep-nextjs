"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestJSON } from "@/lib/client-api";
import { RecoveryKeyPanel } from "@/components/RecoveryKeyPanel";

export default function Recover() {
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [password, setPassword] = useState("");
  const [nextKey, setNextKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const router = useRouter();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] p-6">
        {nextKey ? (
          <RecoveryKeyPanel
            recoveryKey={nextKey}
            onContinue={() => router.push("/auth/signin")}
          />
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold">Recover Noteweld</h1>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              Use your saved recovery key and choose a new passphrase. This
              signs out existing sessions.
            </p>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  const result = await requestJSON<{ recoveryKey: string }>(
                    "/api/auth/recover",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        email,
                        recoveryKey: key,
                        password,
                      }),
                    },
                  );
                  setNextKey(result.recoveryKey);
                  setPassword("");
                  setKey("");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Recovery failed. Retry later.",
                  );
                } finally {
                  setBusy(false);
                  lock.current = false;
                }
              }}
            >
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
                />
              </label>
              <label className="block text-sm">
                Recovery key
                <input
                  type="password"
                  required
                  autoComplete="off"
                  maxLength={100}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
                />
              </label>
              <label className="block text-sm">
                New passphrase
                <input
                  type="password"
                  required
                  minLength={15}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
                />
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                At least 15 characters, at most 72 UTF-8 bytes. Spaces are
                preserved.
              </p>
              {error && (
                <p role="alert" className="text-sm text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[var(--accent)] p-3 font-semibold text-black"
              >
                {busy ? "Recovering…" : "Reset passphrase"}
              </button>
            </form>
            <Link href="/auth/signin" className="mt-5 block text-sm underline">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
