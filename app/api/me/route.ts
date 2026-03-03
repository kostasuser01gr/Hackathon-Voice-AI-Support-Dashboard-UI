import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  const config = getAppConfig();

  return NextResponse.json({
    session,
    featureWave1: config.featureWave1,
    integrationsMode: config.integrationsMode,
  });
}
