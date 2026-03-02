import { NextResponse } from "next/server";
import { z } from "zod";

import { ProcessResponseSchema } from "@/lib/schema";

const BodySchema = z
  .object({
    endpoint: z.string().url(),
    session: ProcessResponseSchema,
  })
  .strict();

function isPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  );
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid webhook export payload.",
        },
      },
      { status: 400 },
    );
  }

  const endpoint = new URL(parsed.data.endpoint);
  if (endpoint.protocol !== "https:" || isPrivateHost(endpoint.hostname)) {
    return NextResponse.json(
      {
        error: {
          code: "UNSAFE_ENDPOINT",
          message: "Only public HTTPS endpoints are allowed.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed.data.session),
    });

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_DELIVERY_FAILED",
          message: "Failed to deliver webhook payload.",
        },
      },
      { status: 502 },
    );
  }
}
