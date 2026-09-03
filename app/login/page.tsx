"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      email: emailValue.trim(),
      password: passwordValue,
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

      window.location.replace(data.redirectTo || "/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleQuickSeed = async () => {
    setSeedStatus("Seeding admin account...");
    try {
      const res = await fetch("/api/setup/admin", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSeedStatus("Admin configured! Ready to sign in.");
        setEmailValue("admin@ask2global.com");
        setPasswordValue("Admin@2390");
      } else {
        setSeedStatus(data.error || "Failed to seed admin.");
      }
    } catch {
      setSeedStatus("Error executing seed endpoint.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
      <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        {/* Left Brand Panel */}
        <div className="bg-slate-900 p-10 text-white flex flex-col justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TaskFlow</p>
            <h1 className="mt-5 text-3xl font-bold">Welcome back</h1>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Manage your team, deadlines, approvals, and calendar from one secure workspace.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <p>• Smart task assignment & deadlines</p>
            <p>• Google Calendar deadline sync</p>
            <p>• Proof verification & team workflow</p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Sign in</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Access your workspace</h2>
            </div>
            {/* Quick dev-seed trigger */}
            <button
              type="button"
              onClick={handleQuickSeed}
              className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Seed Admin
            </button>
          </div>

          {seedStatus && (
            <div className="mb-4 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 border border-blue-200">
              {seedStatus}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                autoComplete="email"
                required
                placeholder="admin@ask2global.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                name="password"
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Admin@2390"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="relative my-6 text-center text-sm">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-slate-400">or</span>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.replace("/api/auth/google");
            }}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
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