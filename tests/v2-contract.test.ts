import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListSessionsV2 = vi.fn();
const mockListOpenLoopsV2 = vi.fn();

vi.mock("@/lib/api-guards", () => ({
  requireV2Apis: () => null,
  requireRoleAndWorkspaceFromRequest: async () => ({
    session: { workspaceId: "w1", userId: "u1", role: "owner" },
    denied: null,
  }),
}));

vi.mock("@/lib/config", () => ({
  getAppConfig: () => ({
    historyMode: "db",
  }),
}));

vi.mock("@/lib/db", () => ({
  listSessionsV2: (...args: unknown[]) => mockListSessionsV2(...args),
  listOpenLoopsV2: (...args: unknown[]) => mockListOpenLoopsV2(...args),
}));

describe("v2 API contracts", () => {
  beforeEach(() => {
    mockListSessionsV2.mockReset();
    mockListOpenLoopsV2.mockReset();
  });

  it("returns paginated v2 history response shape", async () => {
    mockListSessionsV2.mockResolvedValue({
      items: [
        {
          id: "s1",
          created_at: "2026-03-05T00:00:00.000Z",
          workspace_id: "w1",
          user_id: "u1",
          input_mode: "text",
          transcript: "t",
          summary: "summary",
          tasks: ["a"],
          email_draft: "email",
          audit_trail: [],
          meta: {
            requestId: "r1",
            model: "gemini",
            latencyMs: 10,
            validation: "passed",
            fallbackUsed: false,
            approvalRequired: false,
          },
          review: {
            emailApproved: false,
            tasksApproved: false,
            executed: false,
            taskOwners: {},
            comments: [],
          },
          approval_events: [],
          session_index: {
            entities: [],
            topics: [],
            urgency: "low",
            sentiment: "neutral",
            openLoops: [],
            openLoopsCount: 0,
          },
          verifier_report: {
            ok: true,
            score: 100,
            flags: [],
            policy: "warn",
          },
        },
      ],
      nextCursor: "cursor-1",
    });

    const { GET } = await import("@/app/api/v2/history/route");
    const response = await GET(
      new Request("http://localhost/api/v2/history?pageSize=10"),
    );
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("pagination");
    expect(json).toHaveProperty("items");
    expect((json.items as unknown[]).length).toBe(1);
    expect((json.pagination as { nextCursor: string }).nextCursor).toBe("cursor-1");
  });

  it("returns paginated v2 open loops response shape", async () => {
    mockListOpenLoopsV2.mockResolvedValue({
      items: [
        {
          sessionId: "s1",
          summarySnippet: "summary",
          task: "task",
          createdAt: "2026-03-05T00:00:00.000Z",
          urgency: "low",
        },
      ],
      nextCursor: "cursor-2",
    });

    const { GET } = await import("@/app/api/v2/open-loops/route");
    const response = await GET(
      new Request("http://localhost/api/v2/open-loops?pageSize=10"),
    );
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("pagination");
    expect(json).toHaveProperty("items");
    expect((json.items as unknown[]).length).toBe(1);
    expect((json.pagination as { nextCursor: string }).nextCursor).toBe("cursor-2");
  });
});
