type QualityInput = {
  summary: string;
  taskList: string[];
  emailDraft: string;
};

export type QualityReport = {
  score: number;
  checks: {
    summaryPresent: boolean;
    tasksActionable: boolean;
    emailHasSubject: boolean;
    emailHasFooter: boolean;
  };
};

const ACTION_START_REGEX =
  /^(follow|send|schedule|share|prepare|update|create|review|confirm|draft|book|call|email|sync|investigate|deploy|monitor|document|close|assign)\b/i;

export function scoreQuality(input: QualityInput): QualityReport {
  const checks = {
    summaryPresent: input.summary.trim().length > 0,
    tasksActionable:
      input.taskList.length === 0 ||
      input.taskList.every((task) => ACTION_START_REGEX.test(task.trim())),
    emailHasSubject: /^subject:/i.test(input.emailDraft.trim()),
    emailHasFooter: /please review before sending\.?$/im.test(input.emailDraft),
  };

  const score =
    Number(checks.summaryPresent) * 25 +
    Number(checks.tasksActionable) * 25 +
    Number(checks.emailHasSubject) * 25 +
    Number(checks.emailHasFooter) * 25;

  return {
    score,
    checks,
  };
}
