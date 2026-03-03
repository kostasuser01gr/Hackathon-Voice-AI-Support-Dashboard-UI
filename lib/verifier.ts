import type { VerifierPolicy } from "@/lib/config";
import type { VerifierReport } from "@/lib/session-meta";

type VerifierInput = {
  transcript: string;
  summary: string;
  taskList: string[];
  emailDraft: string;
  policy: VerifierPolicy;
};

type VerifierOutput = {
  report: VerifierReport;
  repaired: {
    summary: string;
    taskList: string[];
    emailDraft: string;
  };
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function extractEntityTokens(text: string) {
  const entities = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  return entities.map((entity) => entity.toLowerCase());
}

function sentenceList(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function overlapRatio(sourceTokens: Set<string>, line: string) {
  const tokens = tokenize(line);
  if (!tokens.length) {
    return 0;
  }

  const hits = tokens.filter((token) => sourceTokens.has(token)).length;
  return hits / tokens.length;
}

export function runGroundingVerifier(input: VerifierInput): VerifierOutput {
  const transcriptTokens = new Set(tokenize(input.transcript));
  const transcriptEntityTokens = new Set(extractEntityTokens(input.transcript));
  const flags: string[] = [];

  let score = 100;
  let summary = input.summary.trim();
  let taskList = input.taskList.map((task) => task.trim()).filter(Boolean);
  let emailDraft = input.emailDraft.trim();

  if (!summary) {
    flags.push("summary_empty");
    score -= 40;
  }

  if (!taskList.length && /\b(please|need to|can you|follow up|schedule|send)\b/i.test(input.transcript)) {
    flags.push("missing_requested_task");
    score -= 30;
  }

  const summarySentences = sentenceList(summary);
  const lowOverlapSummarySentences = summarySentences.filter(
    (sentence) => overlapRatio(transcriptTokens, sentence) < 0.2,
  );
  if (lowOverlapSummarySentences.length > 0) {
    flags.push("summary_low_overlap");
    score -= Math.min(30, lowOverlapSummarySentences.length * 10);
  }

  const lowOverlapTasks = taskList.filter((task) => overlapRatio(transcriptTokens, task) < 0.2);
  if (lowOverlapTasks.length > 0) {
    flags.push("task_low_overlap");
    score -= Math.min(40, lowOverlapTasks.length * 12);
  }

  const outputEntities = new Set([
    ...extractEntityTokens(summary),
    ...extractEntityTokens(taskList.join("\n")),
    ...extractEntityTokens(emailDraft),
  ]);
  const leakedEntities = [...outputEntities].filter(
    (entity) => !transcriptEntityTokens.has(entity),
  );
  if (leakedEntities.length > 0) {
    flags.push("entity_leakage");
    score -= Math.min(30, leakedEntities.length * 6);
  }

  if (!/please review before sending\.?$/im.test(emailDraft)) {
    flags.push("email_footer_missing");
    score -= 10;
  }

  if (!/^subject:/i.test(emailDraft)) {
    flags.push("email_subject_missing");
    score -= 15;
  }

  if (input.policy === "repair" && flags.length > 0) {
    if (!summary || lowOverlapSummarySentences.length > 0) {
      summary =
        sentenceList(input.transcript).slice(0, 2).join(" ") ||
        "Summary unavailable due to grounding repair.";
    }

    if (lowOverlapTasks.length > 0) {
      taskList = taskList.filter((task) => overlapRatio(transcriptTokens, task) >= 0.2);
      if (!taskList.length && /\b(please|need to|can you|follow up|schedule|send)\b/i.test(input.transcript)) {
        taskList = ["Follow up on explicitly requested items from transcript."];
      }
    }

    if (!/^subject:/i.test(emailDraft)) {
      emailDraft = `Subject: Transcript Follow-up\n\n${emailDraft}`;
    }
    if (!/please review before sending\.?$/im.test(emailDraft)) {
      emailDraft = `${emailDraft}\n\nPlease review before sending.`;
    }

    score = Math.max(score, 75);
  }

  const ok = score >= 70 && !flags.includes("summary_empty");

  return {
    report: {
      ok,
      score: Math.max(0, Math.min(100, score)),
      flags,
      policy: input.policy,
    },
    repaired: {
      summary,
      taskList,
      emailDraft,
    },
  };
}
