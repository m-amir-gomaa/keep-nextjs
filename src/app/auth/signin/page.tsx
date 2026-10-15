"use client";
import React, { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(), password, redirect: false,
      });
      if (!result?.ok || result.error) {
        setError(result?.code === "rate_limited" ? "Too many sign-in attempts. Wait 15 minutes before retrying." : result?.code === "service_unavailable" ? "Sign in is temporarily unavailable. Please retry shortly." : "Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Could not sign in. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[var(--bg-main)] p-4">
      <div className="w-full max-w-md bg-[var(--surface-overlay)] border border-[var(--border)] rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Noteweld</h1>
          <p className="text-[var(--text-muted)] mt-2">Sign in to continue to your notes</p>
        </div>
        
        {error && <div role="alert" className="bg-red-500/10 text-red-500 text-sm font-medium p-3 rounded-lg mb-6 border border-red-500/20">{error}</div>}

        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-5">
          <div>
            <label htmlFor="signin-email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              id="signin-email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <input
              type="password"
              id="signin-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--text-primary)] text-[var(--bg-main)] font-semibold rounded-xl px-4 py-3 hover:bg-white transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form><p className="mt-4 text-xs text-[var(--text-muted)]">By using this preview, you accept its <Link href="/about" className="underline">limits, privacy and use terms</Link>.</p>

        <p className="mt-5 text-center text-sm"><Link href="/auth/recover" className="text-[var(--accent)] underline">Recover with your private key</Link></p>
        <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
