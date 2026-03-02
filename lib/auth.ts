import { cookies } from "next/headers";

type SessionData = {
  userId: string;
  name: string;
  email: string;
  workspaceId: string;
  role: "owner" | "admin" | "agent" | "viewer";
};

const SESSION_COOKIE = "vaa_demo_session";

const DEFAULT_SESSION: SessionData = {
  userId: "demo-user",
  name: "Demo User",
  email: "demo@voice-action.local",
  workspaceId: "default-workspace",
  role: "owner",
};

function decodeSession(raw: string): SessionData | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionData;
    if (!parsed.userId || !parsed.workspaceId || !parsed.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function encodeSession(session: SessionData) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) {
    return DEFAULT_SESSION;
  }

  return decodeSession(value) ?? DEFAULT_SESSION;
}

export async function setServerSession(session: Partial<SessionData>) {
  const cookieStore = await cookies();
  const merged: SessionData = {
    ...DEFAULT_SESSION,
    ...session,
  };

  cookieStore.set({
    name: SESSION_COOKIE,
    value: encodeSession(merged),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return merged;
}

export async function clearServerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
