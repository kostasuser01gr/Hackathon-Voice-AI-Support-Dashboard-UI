"use client";

import type { StoredSession } from "@/lib/history";

type SharedReportViewProps = {
  session: StoredSession;
};

export function SharedReportView({ session }: SharedReportViewProps) {
  const { data, analysis, createdAt } = session;
  const { index, verifier } = analysis;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date(createdAt));

  const sentimentColor = 
    index.sentiment === 'positive' ? 'text-emerald-600 bg-emerald-50' :
    index.sentiment === 'negative' ? 'text-rose-600 bg-rose-50' :
    'text-slate-600 bg-slate-50';

  const urgencyColor = 
    index.urgency === 'high' ? 'text-rose-700 bg-rose-100' :
    index.urgency === 'medium' ? 'text-amber-700 bg-amber-100' :
    'text-emerald-700 bg-emerald-100';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-800 mb-4">
            Official Voice-to-Action Report
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Executive Session Summary
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Processed on {formattedDate}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className={`rounded-2xl p-6 shadow-sm border border-slate-200 bg-white`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Sentiment</p>
            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${sentimentColor}`}>
              {index.sentiment}
            </div>
          </div>
          <div className={`rounded-2xl p-6 shadow-sm border border-slate-200 bg-white`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Urgency</p>
            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${urgencyColor}`}>
              {index.urgency}
            </div>
          </div>
          <div className={`rounded-2xl p-6 shadow-sm border border-slate-200 bg-white`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Safety Score</p>
            <div className={`text-2xl font-bold ${verifier.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {verifier.score}/100
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-4">Transcript Overview</h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-800 leading-relaxed italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-50 rounded-r-lg mb-6">
                &quot;{data.transcript}&quot;
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Generated Summary</h3>
              <p className="text-slate-700 leading-relaxed">
                {data.summary}
              </p>
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900 p-8 shadow-xl text-white">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Extracted Action Items
            </h2>
            <ul className="space-y-4">
              {data.actions.taskList.map((task, i) => (
                <li key={i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-slate-200">{task}</span>
                </li>
              ))}
              {data.actions.taskList.length === 0 && (
                <p className="text-slate-400 italic text-center py-4">No tasks were identified in this session.</p>
              )}
            </ul>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Follow-up Correspondence
            </h2>
            <div className="bg-slate-50 rounded-2xl p-6 font-mono text-sm text-slate-700 whitespace-pre-wrap border border-slate-200">
              {data.actions.emailDraft}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Semantic Intelligence</h2>
            <div className="flex flex-wrap gap-2">
              {index.topics.map(topic => (
                <span key={topic} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {topic}
                </span>
              ))}
              {index.entities.map(entity => (
                <span key={entity} className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold">
                  {entity}
                </span>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>This report was generated autonomously by the Voice-to-Action Agent.</p>
          <p className="mt-1">&copy; 2026 Hackathon AI Solutions Inc.</p>
        </footer>
      </div>
    </div>
  );
}
