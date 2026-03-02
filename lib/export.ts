import type { ProcessResponse } from "@/lib/schema";

export function buildMarkdownExport(result: ProcessResponse): string {
  const tasks = result.actions.taskList.length
    ? result.actions.taskList.map((task) => `- ${task}`).join("\n")
    : "- (none)";

  const auditCompact = result.auditTrail
    .map((item) => `- ${item.step} | ${item.timestamp} | ${item.details}`)
    .join("\n");

  return [
    "# Summary",
    result.summary,
    "",
    "## Tasks",
    tasks,
    "",
    "## Email Draft",
    result.actions.emailDraft,
    "",
    "<details>",
    "<summary>Audit Trail</summary>",
    "",
    auditCompact,
    "",
    "</details>",
  ].join("\n");
}

export function buildJsonExport(result: ProcessResponse): string {
  return JSON.stringify(result, null, 2);
}

export function buildTextExport(result: ProcessResponse): string {
  return [
    "SUMMARY",
    result.summary,
    "",
    "TASKS",
    ...result.actions.taskList.map((task, index) => `${index + 1}. ${task}`),
    "",
    "EMAIL DRAFT",
    result.actions.emailDraft,
    "",
    "AUDIT TRAIL",
    ...result.auditTrail.map(
      (item) => `${item.timestamp} | ${item.step} | ${item.details}`,
    ),
  ].join("\n");
}
