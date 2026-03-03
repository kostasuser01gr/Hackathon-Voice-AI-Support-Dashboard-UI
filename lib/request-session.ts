import { DEFAULT_SESSION, type SessionData, type SessionRole } from "@/lib/auth";

export function getSessionFromRequest(request: Request): SessionData {
  const userId = request.headers.get("x-session-user-id");
  const workspaceId = request.headers.get("x-session-workspace-id");
  const role = request.headers.get("x-session-role");

  const parsedRole: SessionRole =
    role === "owner" || role === "admin" || role === "agent" || role === "viewer"
      ? role
      : DEFAULT_SESSION.role;

  if (!userId || !workspaceId) {
    return DEFAULT_SESSION;
  }

  return {
    ...DEFAULT_SESSION,
    userId,
    workspaceId,
    role: parsedRole,
  };
}
