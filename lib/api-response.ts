import { NextResponse } from "next/server";

type ApiErrorParams = {
  status: number;
  code: string;
  detailsCode?: string;
  message: string;
  requestId: string;
  retryAfter?: number;
  correlationId?: string;
  extra?: Record<string, unknown>;
};

export function jsonError(params: ApiErrorParams) {
  const payload: Record<string, unknown> = {
    error: {
      code: params.code,
      detailsCode: params.detailsCode,
      message: params.message,
      requestId: params.requestId,
      ...(typeof params.retryAfter === "number"
        ? { retryAfter: params.retryAfter }
        : {}),
    },
    ...(params.extra ?? {}),
  };

  const response = NextResponse.json(payload, { status: params.status });
  if (params.correlationId) {
    response.headers.set("x-correlation-id", params.correlationId);
  }
  return response;
}
