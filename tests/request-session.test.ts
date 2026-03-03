import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionContextFromRequest } from "@/lib/request-session";

function makeSessionCookie(session: Record<string, string>, secret?: string) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  if (!secret) {
    return payload;
  }

  const signature = createHmac("sha256", secret)
    .update(`v1.${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("getSessionContextFromRequest", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevSecret = process.env.SESSION_SIGNING_SECRET;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (prevNodeEnv) {
      vi.stubEnv("NODE_ENV", prevNodeEnv);
    }
    if (prevSecret) {
      vi.stubEnv("SESSION_SIGNING_SECRET", prevSecret);
    }
  });

  it("prefers signed cookie session when secret is configured", () => {
    vi.stubEnv("SESSION_SIGNING_SECRET", "test-secret");

    const cookie = makeSessionCookie(
      {
        userId: "cookie-user",
        name: "Cookie User",
        email: "cookie@example.com",
        workspaceId: "ws-cookie",
        role: "admin",
      },
      process.env.SESSION_SIGNING_SECRET,
    );

    const request = new Request("http://localhost/api/process", {
      headers: {
        cookie: `vaa_demo_session=${cookie}`,
        "x-session-user-id": "header-user",
        "x-session-workspace-id": "ws-header",
        "x-session-role": "owner",
      },
    });

    const context = getSessionContextFromRequest(request);

    expect(context.source).toBe("cookie_signed");
    expect(context.session.userId).toBe("cookie-user");
    expect(context.session.workspaceId).toBe("ws-cookie");
    expect(context.session.role).toBe("admin");
  });

  it("falls back to proxy headers in non-production", () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.SESSION_SIGNING_SECRET;

    const request = new Request("http://localhost/api/process", {
      headers: {
        "x-session-user-id": "header-user",
        "x-session-workspace-id": "ws-header",
        "x-session-role": "broken-role",
      },
    });

    const context = getSessionContextFromRequest(request);

    expect(context.source).toBe("proxy_header_fallback");
    expect(context.session.userId).toBe("header-user");
    expect(context.session.workspaceId).toBe("ws-header");
    expect(context.session.role).toBe("viewer");
  });

  it("blocks unsigned cookie fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SIGNING_SECRET", "prod-secret");

    const unsignedCookie = makeSessionCookie({
      userId: "unsigned-user",
      name: "Unsigned",
      email: "unsigned@example.com",
      workspaceId: "ws-unsigned",
      role: "owner",
    });

    const request = new Request("http://localhost/api/process", {
      headers: {
        cookie: `vaa_demo_session=${unsignedCookie}`,
        "x-session-user-id": "header-user",
        "x-session-workspace-id": "ws-header",
        "x-session-role": "owner",
      },
    });

    const context = getSessionContextFromRequest(request);

    expect(context.source).toBe("default");
    expect(context.session.role).toBe("viewer");
    expect(context.session.userId).toBe("anonymous-user");
  });
});
