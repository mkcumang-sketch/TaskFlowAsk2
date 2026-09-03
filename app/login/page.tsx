"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }

      // Role-based target URL par hard-redirect taaki fresh session cookies bind ho sakein
      window.location.href = data.redirectTo || "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch("/api/google");
      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }

      setError("Google OAuth is not configured yet. Add credentials to enable sign-in.");
    } catch {
      setError("Could not reach Google sign-in endpoint.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
      <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="bg-slate-900 p-10 text-white flex flex-col justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TaskFlow</p>
            <h1 className="mt-5 text-3xl font-bold">Welcome back</h1>
            <p className="mt-3 text-slate-300">
              Manage your team, deadlines, approvals, and calendar from one secure workspace.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <p>• Smart task assignment & deadlines</p>
            <p>• Google Calendar deadline sync</p>
            <p>• Proof verification & team workflow</p>
          </div>
        </div>

        <div className="p-10">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Sign in</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Access your workspace</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">or</div>

          <button
            type="button"
            onClick={connectGoogle}
            className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 hover:bg-slate-50 transition"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/" className="font-semibold text-slate-900 hover:underline">
              Create a workspace
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}