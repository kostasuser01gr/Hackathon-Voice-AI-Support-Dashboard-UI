import { createHmac, timingSafeEqual } from "node:crypto";

import type { StoredSession } from "@/lib/history";

type SharePayload = {
  v: 1;
  iat: number;
  session: StoredSession;
};

function getSecret() {
  return process.env.SHARE_TOKEN_SECRET || "local-demo-share-secret";
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(withPadding, "base64").toString("utf8");
}

function signPayload(payloadEncoded: string) {
  return createHmac("sha256", getSecret()).update(payloadEncoded).digest("base64url");
}

export function createShareToken(session: StoredSession) {
  const payload: SharePayload = {
    v: 1,
    iat: Date.now(),
    session,
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function parseShareToken(token: string): SharePayload | null {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = signPayload(payloadEncoded);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const raw = fromBase64Url(payloadEncoded);
    const parsed = JSON.parse(raw) as SharePayload;
    if (parsed.v !== 1 || !parsed.session?.id || !parsed.session?.data) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
