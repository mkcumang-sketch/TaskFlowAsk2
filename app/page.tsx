import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">T</div>
          <div>
            <p className="text-xl font-bold tracking-tight">TASKFLOW</p>
            <p className="text-sm text-slate-500">Accountability OS</p>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Team workflow automation</p>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Assign once. Automate the rest.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              TaskFlow manages task assignment, reminders, calendar sync, proof review, approvals, and accountability across teams with secure organization-level controls.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700">
                Sign in
              </Link>
              <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Workflow highlights</p>
            <ul className="mt-6 space-y-4 text-sm text-slate-200">
              <li>• Automated assignment notifications and email delivery</li>
              <li>• Google Calendar sync and conflict awareness</li>
              <li>• Reminder engine with escalation and proof requirements</li>
              <li>• Real task, project, workload, and approval analytics</li>
              <li>• Secure organization isolation and RBAC enforcement</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
