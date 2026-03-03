import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { maskEmail } from "@/lib/auth";
import { getSessionContextFromRequest } from "@/lib/request-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { session, source } = getSessionContextFromRequest(request);
  const config = getAppConfig();

  return NextResponse.json({
    session: {
      userId: session.userId,
      workspaceId: session.workspaceId,
      role: session.role,
      name: session.name,
      email: maskEmail(session.email),
    },
    authSource: source,
    featureWave1: config.featureWave1,
    integrationsMode: config.integrationsMode,
  });
}
