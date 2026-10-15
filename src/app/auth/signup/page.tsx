"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthInputError, parseRegistration } from "@/lib/auth-input";
import { requestJSON } from "@/lib/client-api";
import { RecoveryKeyPanel } from "@/components/RecoveryKeyPanel";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const router = useRouter();
  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || created) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const input = parseRegistration({ name, email, password });
      const result = await requestJSON<{ recoveryKey: string }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ ...input, name: input.name ?? "" }),
        },
      );
      setKey(result.recoveryKey);
      setCreated(true);
    } catch (e) {
      setError(
        e instanceof AuthInputError || e instanceof Error
          ? e.message
          : "Could not create the account. Retry later.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function continueToWorkspace() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!result?.ok || result.error)
        throw new Error(
          "Your account is created. Use Sign in below to continue; keep the recovery key you saved.",
        );
      setPassword("");
      setKey("");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your account is created. Sign in to continue.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-semibold">
          {created ? "Account created" : "Create a Noteweld account"}
        </h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Private notes, clear save controls, room to think.
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-400/30 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        {created ? (
          <>
            <RecoveryKeyPanel
              recoveryKey={key}
              onContinue={() => {
                if (!busy) void continueToWorkspace();
              }}
            />
            {busy && (
              <p role="status" className="mt-3 text-sm">
                Signing in…
              </p>
            )}
          </>
        ) : (
          <form onSubmit={register} aria-busy={busy} className="space-y-4">
            <label className="block text-sm" htmlFor="signup-name">
              Name
              <input
                id="signup-name"
                required
                maxLength={100}
                autoComplete="name"
                disabled={busy}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
              />
            </label>
            <label className="block text-sm" htmlFor="signup-email">
              Email
              <input
                id="signup-email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
              />
            </label>
            <label className="block text-sm" htmlFor="signup-password">
              Password
              <input
                id="signup-password"
                type="password"
                required
                minLength={15}
                autoComplete="new-password"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-main)] p-3"
              />
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Use at least 15 characters and at most 72 UTF-8 bytes. Spaces are
              preserved. Save the private recovery key shown after signup; email
              verification and email resets are not available.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[var(--accent)] p-3 font-semibold text-black"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          By using this preview, you accept its{" "}
          <Link href="/about" className="underline">
            limits, privacy and use terms
          </Link>
          .
        </p>
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already registered?{" "}
          <Link href="/auth/signin" className="text-[var(--accent)] underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
