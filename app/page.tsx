import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 font-sans text-slate-100 selection:bg-purple-500 selection:text-white flex flex-col justify-between">
      {/* 🔮 Background Aurora Light Spheres & Dynamic Mesh Glows */}
      <div className="pointer-events-none fixed -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-transparent blur-[160px]" />
      <div className="pointer-events-none fixed top-1/3 -right-48 h-[680px] w-[680px] rounded-full bg-gradient-to-bl from-indigo-500/25 via-purple-900/30 to-transparent blur-[180px]" />
      <div className="pointer-events-none fixed -bottom-48 left-1/3 h-[620px] w-[620px] rounded-full bg-gradient-to-t from-fuchsia-600/15 via-purple-800/15 to-transparent blur-[170px]" />

      {/* 🛸 Subtle Cyber Grid Overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

      {/* 🧭 Top Navigation Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-xl font-black text-white shadow-xl shadow-purple-600/30 ring-1 ring-white/20">
            <span>TF</span>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-300" />
            </span>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              TASKFLOW
              <span className="rounded-lg bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
                PRO
              </span>
            </span>
            <p className="text-xs font-semibold text-slate-400">Autonomous Team OS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs md:text-sm font-black text-white backdrop-blur-xl transition hover:border-purple-400/60 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/20 active:scale-95"
          >
            <span>Continue with Google</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </header>

      {/* 🌟 Hero Centerpiece */}
      <main className="relative z-10 mx-auto my-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12">
          {/* Left Column: Core Value Proposition */}
          <div className="space-y-8 lg:col-span-7">
            {/* Holographic Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-purple-400/30 bg-purple-950/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-purple-300 shadow-inner backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Zero Manual Overhead • OAuth Gated</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
                Assign once. <br />
                <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
                  Automate the rest.
                </span>
              </h1>
              <p className="max-w-2xl text-base md:text-lg font-medium text-slate-400 leading-relaxed">
                TaskFlow orchestrates team assignments, proof verification, Google Calendar sync, and escalation protocols with enterprise-level role governance.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-8 text-sm font-black text-white shadow-xl shadow-purple-600/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-98"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <span>Launch Workspace</span>
                <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-black text-slate-200 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                Open Live Hub
              </Link>
            </div>

            {/* Micro Specs */}
            <div className="grid grid-cols-3 gap-4 pt-6 max-w-xl border-t border-white/10">
              <div>
                <span className="block text-2xl font-black text-white tracking-tight">100%</span>
                <span className="text-xs font-semibold text-slate-400">Passwordless</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-purple-300 tracking-tight">&lt; 1s</span>
                <span className="text-xs font-semibold text-slate-400">Handle Routing</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-indigo-300 tracking-tight">Realtime</span>
                <span className="text-xs font-semibold text-slate-400">SLA Tracking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic Glass Cards */}
          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-[38px] border border-white/15 bg-gradient-to-br from-white/10 via-slate-900/60 to-purple-950/40 p-8 shadow-2xl shadow-purple-950/50 backdrop-blur-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                    Active Orchestration
                  </span>
                </div>
                <span className="rounded-xl border border-purple-400/30 bg-purple-500/20 px-3 py-1 font-mono text-[11px] font-bold text-purple-200">
                  v2.0 Enterprise
                </span>
              </div>

              {/* Feature Matrix Rows */}
              <div className="space-y-4">
                {[
                  {
                    icon: "⚡",
                    title: "Instant @Handle Dispatch",
                    desc: "Type @handle in Quick Capture to auto-route tasks, notify colleagues, and schedule blocks.",
                  },
                  {
                    icon: "📅",
                    title: "Smart Calendar Integration",
                    desc: "Automatic conflict detection with bi-directional Google Calendar sync.",
                  },
                  {
                    icon: "🛡️",
                    title: "Proof & Escalation Engine",
                    desc: "Automated supervisor escalation when proof of deliverable is pending.",
                  },
                  {
                    icon: "🔒",
                    title: "Strict Single Sign-On",
                    desc: "Protected by Google OAuth 2.0. Admin-enrolled whitelist access only.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition hover:border-purple-400/40 hover:bg-white/10 hover:-translate-y-0.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-lg ring-1 ring-purple-400/30">
                      {item.icon}
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white tracking-tight">{item.title}</h4>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Holographic Footer Accent inside Card */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 p-4 border border-purple-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">✨</span>
                  <span className="text-xs font-bold text-purple-200">
                    Dual Admin Super-Access Enabled
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 🚀 Footer Credit Line */}
      <footer className="relative z-20 w-full border-t border-white/10 bg-slate-950/80 backdrop-blur-xl py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row text-center sm:text-left">
          <p className="text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} TaskFlow Systems. All rights reserved.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-5 py-2 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
            <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
              DevOps By <span className="text-purple-300">UMANG SHARMA</span> & <span className="text-indigo-300">RISHABH TIWARI</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}