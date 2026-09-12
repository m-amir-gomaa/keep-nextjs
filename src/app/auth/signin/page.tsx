"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-main)]">
      <div className="w-full max-w-md bg-[var(--surface-overlay)] border border-[var(--border)] rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Keep Next</h1>
          <p className="text-[var(--text-muted)] mt-2">Sign in to continue to your notes</p>
        </div>
        
        {error && <div className="bg-red-500/10 text-red-500 text-sm font-medium p-3 rounded-lg mb-6 border border-red-500/20">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--text-primary)] text-[var(--bg-main)] font-semibold rounded-xl px-4 py-3 hover:bg-white transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
