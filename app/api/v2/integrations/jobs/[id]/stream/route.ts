import {
  requireRoleAndWorkspaceFromRequest,
  requireV2Apis,
} from "@/lib/api-guards";
import { getIntegrationJobWithFallback } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;

  const v2Blocked = requireV2Apis(requestId);
  if (v2Blocked) {
    return v2Blocked;
  }

  const { session, denied } = await requireRoleAndWorkspaceFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_INTEGRATION_JOB_READ_DENIED",
  );
  if (denied) {
    denied.headers.set("x-correlation-id", correlationId);
    return denied;
  }

  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastStatus = "";
      let ticks = 0;
      const maxTicks = 60;
      let timer: ReturnType<typeof setInterval> | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      async function emit() {
        if (closed) {
          return;
        }

        const closeStream = () => {
          if (closed) {
            return;
          }
          closed = true;
          if (timer) {
            clearInterval(timer);
          }
          if (heartbeat) {
            clearInterval(heartbeat);
          }
          controller.close();
        };

        const job = await getIntegrationJobWithFallback(id);
        if (!job || job.workspaceId !== session.workspaceId) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                code: "NOT_FOUND",
                message: "Job not found.",
                requestId,
              })}\n\n`,
            ),
          );
          closeStream();
          return;
        }

        if (job.status !== lastStatus) {
          lastStatus = job.status;
          controller.enqueue(
            encoder.encode(
              `event: job\ndata: ${JSON.stringify({
                requestId,
                correlationId,
                job,
              })}\n\n`,
            ),
          );
        }

        if (job.status === "completed" || job.status === "failed") {
          closeStream();
          return;
        }

        ticks += 1;
        if (ticks >= maxTicks) {
          controller.enqueue(
            encoder.encode(
              `event: timeout\ndata: ${JSON.stringify({
                requestId,
                correlationId,
                message: "Stream timeout reached.",
              })}\n\n`,
            ),
          );
          closeStream();
        }
      }

      await emit();
      timer = setInterval(() => {
        void emit();
      }, 1000);

      // Heartbeat to keep connections alive on some proxies.
      heartbeat = setInterval(() => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
    },
    cancel() {
      // The runtime will close intervals when stream is cancelled by client disconnect.
      return;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-correlation-id": correlationId,
    },
  });
}
