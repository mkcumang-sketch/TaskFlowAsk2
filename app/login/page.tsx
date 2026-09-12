"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginCard() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const getErrorNotice = (err: string | null) => {
    switch (err) {
      case "access_denied_not_invited":
        return "Access Restricted: This Google account is not enrolled in the team directory. Please contact your workspace administrator to add your email.";
      case "oauth_cancelled":
        return "Google sign-in was cancelled. Please try again.";
      case "no_email":
        return "No email was returned by Google. Check your Google account permissions.";
      case "auth_failed":
        return "Authentication encountered an error. Please try again.";
      default:
        return null;
    }
  };

  const errorMessage = getErrorNotice(errorParam);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 p-4 font-sans select-none">
      {/* 🔮 Background Aurora Light Spheres */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-indigo-500/25 to-purple-800/25 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[680px] w-[680px] rounded-full bg-purple-900/10 blur-[180px]" />

      {/* ▦ Centered Modern OAuth Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[38px] border border-white/10 bg-slate-900/70 p-8 md:p-10 shadow-2xl shadow-purple-950/40 backdrop-blur-2xl text-center space-y-7">
        {/* Workspace Brand Badge */}
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 shadow-inner">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-purple-300">
            TASKFLOW ENTERPRISE
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Welcome to TaskFlow
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-400">
            Authenticate securely using your organization's Google Workspace account.
          </p>
        </div>

        {/* Dynamic Error Banner */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-bold text-rose-300 animate-in fade-in space-y-1 text-left">
            <div className="flex items-center gap-2 text-rose-200">
              <span>🚨</span>
              <span className="uppercase tracking-wider font-black">Unauthorized Account</span>
            </div>
            <p className="text-rose-300/90 font-normal leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* 🚀 Exclusive Google OAuth Trigger Button */}
        <div className="pt-2">
          <a href="/api/auth/google" className="block w-full">
            <button
              type="button"
              className="group relative w-full h-14 flex items-center justify-center gap-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/20 overflow-hidden"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />

              {/* Google Brand Logo */}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
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
              </div>

              <span className="tracking-wide">Continue with Google</span>
            </button>
          </a>
        </div>

        {/* Security / Admin Instruction Footnote */}
        <div className="border-t border-white/10 pt-5 text-[11px] font-semibold text-slate-500 leading-relaxed">
          Access is restricted to pre-authorized accounts. Admins can enroll new employees via the Team Directory.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginCard />
    </Suspense>
  );
}