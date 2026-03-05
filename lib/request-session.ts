import { DEFAULT_SESSION, parseSessionCookieValue, type SessionData, type SessionRole } from "@/lib/auth";

type SessionSource = "cookie_signed" | "cookie_unsigned" | "proxy_header_fallback" | "default";

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part) {
      continue;
    }

    const [name, ...rest] = part.split("=");
    if (name === "vaa_demo_session") {
      return rest.join("=");
    }
  }

  return null;
}

function canUseHeaderFallback() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const allowInProd = process.env.ALLOW_HEADER_SESSION_FALLBACK_IN_PROD
    ?.trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(allowInProd ?? "");
}

export function getSessionContextFromRequest(request: Request): {
  session: SessionData;
  source: SessionSource;
} {
  const cookieValue = parseCookieHeader(request.headers.get("cookie"));
  const parsedCookie = parseSessionCookieValue(cookieValue);
  if (parsedCookie) {
    return {
      session: parsedCookie.session,
      source: parsedCookie.signed ? "cookie_signed" : "cookie_unsigned",
    };
  }

  if (!canUseHeaderFallback()) {
    return {
      session: {
        ...DEFAULT_SESSION,
        userId: "anonymous-user",
        role: "viewer",
      },
      source: "default",
    };
  }

  const userId = request.headers.get("x-session-user-id");
  const workspaceId = request.headers.get("x-session-workspace-id");
  const role = request.headers.get("x-session-role");

  const parsedRole: SessionRole =
    role === "owner" || role === "admin" || role === "agent" || role === "viewer"
      ? role
      : "viewer";

  if (!userId || !workspaceId) {
    return {
      session: DEFAULT_SESSION,
      source: "default",
    };
  }

  return {
    session: {
      ...DEFAULT_SESSION,
      userId,
      workspaceId,
      role: parsedRole,
    },
    source: "proxy_header_fallback",
  };
}

export function getSessionFromRequest(request: Request): SessionData {
  return getSessionContextFromRequest(request).session;
}
