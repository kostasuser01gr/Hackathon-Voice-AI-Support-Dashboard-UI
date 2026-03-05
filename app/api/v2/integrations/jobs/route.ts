import {
  requireRoleAndWorkspaceFromRequest,
  requireV2Apis,
} from "@/lib/api-guards";
import { jsonError } from "@/lib/api-response";
import { getAppConfig } from "@/lib/config";
import { listIntegrationJobsV2 } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

  const config = getAppConfig();
  if (config.historyMode !== "db") {
    return jsonError({
      status: 400,
      code: "HISTORY_MODE_LOCAL",
      detailsCode: "INTEGRATION_JOBS_DB_REQUIRED",
      message: "Job list endpoint requires HISTORY_MODE=db.",
      requestId,
      correlationId,
    });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10);
  const service = url.searchParams.get("service") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const ownOnly = url.searchParams.get("ownOnly") === "true";

  const page = await listIntegrationJobsV2({
    workspaceId: session.workspaceId,
    userId: ownOnly ? session.userId : undefined,
    status,
    service,
    pageSize,
    cursor,
  });

  return Response.json(
    {
      requestId,
      correlationId,
      pagination: {
        pageSize: Math.max(1, Math.min(pageSize, 100)),
        nextCursor: page.nextCursor,
      },
      items: page.items,
    },
    { headers: { "x-correlation-id": correlationId } },
  );
}
