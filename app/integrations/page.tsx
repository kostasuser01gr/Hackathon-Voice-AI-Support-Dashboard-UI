import Link from "next/link";

const cards = [
  {
    title: "Gmail",
    description: "Draft and review outbound follow-up emails.",
  },
  {
    title: "Google Calendar",
    description: "Convert extracted tasks into calendar events.",
  },
  {
    title: "Jira / Zendesk",
    description: "Send action items to issue tracking queues.",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f5ff_0%,#f5f9ff_35%,#f7f6ff_60%,#ffffff_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">Integrations</h1>
              <p className="text-sm text-slate-600">
                Integrations are mock mode for hackathon demo.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_8px_32px_rgba(15,23,42,0.08)]"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900"
                >
                  Connect (stub)
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  Dry-run only
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
