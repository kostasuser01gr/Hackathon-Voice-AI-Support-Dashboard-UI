"use client";

import Link from "next/link";
import { useState } from "react";

type IntegrationService = "gmail" | "calendar" | "jira_zendesk";

const cards: Array<{
  id: IntegrationService;
  title: string;
  description: string;
}> = [
  {
    id: "gmail",
    title: "Gmail",
    description: "Draft and review outbound follow-up emails.",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    description: "Convert extracted tasks into calendar events.",
  },
  {
    id: "jira_zendesk",
    title: "Jira / Zendesk",
    description: "Send action items to issue tracking queues.",
  },
];

export default function IntegrationsPage() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [latestJob, setLatestJob] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState("");

  const runIntegration = async (
    service: IntegrationService,
    action: "dry_run" | "connect_stub" | "execute",
  ) => {
    setStatus((previous) => ({
      ...previous,
      [service]: "Queuing...",
    }));

    try {
      const response = await fetch("/api/integrations/execute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          service,
          action,
          sessionId: sessionId.trim() || undefined,
          payload: {
            source: "integrations_page",
            requestedAction: action,
          },
          idempotencyKey:
            action === "execute" ? `${service}:${action}:${sessionId || "none"}` : undefined,
        }),
      });

      const payload = (await response.json()) as {
        job?: { id: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.job) {
        throw new Error(payload.error?.message ?? "Could not enqueue job.");
      }
      const jobId = payload.job.id;

      setStatus((previous) => ({
        ...previous,
        [service]: `Queued job ${jobId}`,
      }));
      setLatestJob((previous) => ({
        ...previous,
        [service]: jobId,
      }));

      window.setTimeout(async () => {
        try {
          const statusResponse = await fetch(`/api/integrations/jobs/${jobId}`, {
            cache: "no-store",
          });
          const statusPayload = (await statusResponse.json()) as {
            job?: { status?: string; result?: string };
          };
          if (statusPayload.job) {
            const jobStatus = statusPayload.job.status ?? "running";
            const jobResult = statusPayload.job.result ?? "in progress";
            setStatus((previous) => ({
              ...previous,
              [service]: `${jobStatus}: ${jobResult}`,
            }));
          }
        } catch {
          setStatus((previous) => ({
            ...previous,
            [service]: "Could not fetch job status.",
          }));
        }
      }, 800);
    } catch (error) {
      setStatus((previous) => ({
        ...previous,
        [service]: error instanceof Error ? error.message : "Request failed.",
      }));
    }
  };

  const retryLatestJob = async (service: IntegrationService) => {
    const jobId = latestJob[service];
    if (!jobId) {
      setStatus((previous) => ({
        ...previous,
        [service]: "No previous job to retry.",
      }));
      return;
    }

    setStatus((previous) => ({
      ...previous,
      [service]: "Retrying...",
    }));

    try {
      const response = await fetch(`/api/integrations/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as { job?: { id: string } };
      if (!response.ok || !payload.job) {
        throw new Error("Retry failed.");
      }
      setLatestJob((previous) => ({
        ...previous,
        [service]: payload.job!.id,
      }));
      setStatus((previous) => ({
        ...previous,
        [service]: `Retry queued as ${payload.job!.id}`,
      }));
    } catch {
      setStatus((previous) => ({
        ...previous,
        [service]: "Retry failed.",
      }));
    }
  };

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
              <Link
                href="/actions"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Actions
              </Link>
              <Link
                href="/open-loops"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Open Loops
              </Link>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Integrations are mock mode for hackathon demo by default. Execution is blocked
            until approvals when `action=execute` + a DB `sessionId` are provided.
          </div>
          <label className="mt-3 block text-sm text-slate-700">
            Session ID for approval-gated execute (optional)
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="uuid from session meta.requestId"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
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
                  onClick={() => runIntegration(card.id, "connect_stub")}
                  className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900"
                >
                  Connect (stub)
                </button>
                <button
                  type="button"
                  onClick={() => runIntegration(card.id, "dry_run")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  Dry-run only
                </button>
                <button
                  type="button"
                  onClick={() => runIntegration(card.id, "execute")}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
                >
                  Execute (gated)
                </button>
                <button
                  type="button"
                  onClick={() => retryLatestJob(card.id)}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900"
                >
                  Retry last
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {status[card.id] ?? "No jobs yet."}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
