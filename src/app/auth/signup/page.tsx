"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to register");
      } else {
        // Log them in immediately
        await signIn("credentials", { email, password, redirect: false });
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-main)]">
      <div className="w-full max-w-md bg-[var(--surface-overlay)] border border-[var(--border)] rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Create Account</h1>
          <p className="text-[var(--text-muted)] mt-2">Start keeping your notes beautifully</p>
        </div>
        
        {error && <div className="bg-red-500/10 text-red-500 text-sm font-medium p-3 rounded-lg mb-6 border border-red-500/20">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--surface-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              placeholder="John Doe"
            />
          </div>
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
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-[#000] font-semibold rounded-xl px-4 py-3 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-[var(--text-primary)] hover:text-white font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
