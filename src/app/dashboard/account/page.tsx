"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";
import { requestJSON } from "@/lib/client-api";
import { RecoveryKeyPanel } from "@/components/RecoveryKeyPanel";
import { useDraftGuard } from "@/components/WorkspaceContext";

export default function Account() {
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  useDraftGuard(Boolean(password || key));
  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-3 text-2xl font-semibold">Account</h1>
      {key ? (
        <RecoveryKeyPanel
          recoveryKey={key}
          onContinue={() => {
            setKey("");
            setPassword("");
          }}
        />
      ) : (
        <>
          <p className="mb-6 text-sm text-[var(--text-muted)]">
            Replace your recovery key if you lost it or shared it. The previous
            key stops working immediately. We do not send email password resets.
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
                  "/api/account/recovery",
                  { method: "POST", body: JSON.stringify({ password }) },
                );
                setKey(result.recoveryKey);
                setPassword("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not replace the key.",
                );
              } finally {
                setBusy(false);
                lock.current = false;
              }
            }}
          >
            <label className="block text-sm">
              Current passphrase
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black"
            >
              {busy ? "Replacing…" : "Replace recovery key"}
            </button>
          </form>
          <p className="mt-8 text-sm text-[var(--text-muted)]">
            Early preview: up to 250 notes, 50 labels and 2 MiB of note text per
            account. Billing and paid plans are not enabled.
          </p>
        </>
      )}
      <div className="mt-10 space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-semibold">Keep a copy</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Download all saved notes, checklists and labels. Unsaved drafts are
          not included.
        </p>
        <a
          href="/api/account"
          download
          className="inline-block rounded-lg border border-[var(--border)] px-4 py-3 text-sm underline"
        >
          Export account JSON
        </a>
        <p>
          <Link href="/about" className="text-sm underline">
            Preview limits, privacy and use
          </Link>
        </p>
      </div>
      <details className="mt-10 rounded-xl border border-red-400/30 p-4">
        <summary className="cursor-pointer text-red-300">
          Delete account permanently
        </summary>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              lock.current ||
              !window.confirm(
                "Permanently delete your account, notes and labels? This cannot be undone.",
              )
            )
              return;
            lock.current = true;
            setDeleting(true);
            setError("");
            try {
              await requestJSON("/api/account", {
                method: "DELETE",
                body: JSON.stringify({ password, confirmation }),
              });
              setPassword("");
              setConfirmation("");
              await signOut({ redirect: false });
              router.push("/auth/signin");
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not delete the account.",
              );
            } finally {
              lock.current = false;
              setDeleting(false);
            }
          }}
        >
          <p className="text-sm">
            Export first. All live notes and labels will be removed and existing
            sessions will stop working.
          </p>
          <label className="block text-sm">
            Deletion passphrase
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
            />
          </label>
          <label className="block text-sm">
            Type DELETE
            <input
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
            />
          </label>
          <button
            disabled={deleting || confirmation !== "DELETE"}
            className="rounded-lg bg-red-900 px-4 py-3 text-sm"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </form>
      </details>
    </section>
  );
}
