type SafetyInput = {
  transcript: string;
  summary: string;
  taskList: string[];
  emailDraft: string;
};

export type SafetyResult = {
  ok: boolean;
  fallbackUsed: boolean;
  issues: string[];
  normalized: {
    summary: string;
    taskList: string[];
    emailDraft: string;
  };
};

const ACTION_PREFIX_REGEX =
  /^(follow|send|schedule|share|prepare|update|create|review|confirm|draft|book|call|email|sync|investigate|deploy|monitor|document|close|assign)\b/i;

function countSentences(text: string) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function hasExplicitRequest(transcript: string) {
  return /\b(please|need to|can you|could you|action item|follow up|schedule|send|prepare|share|book|draft|update|assign)\b/i.test(
    transcript,
  );
}

function extractPotentialEntities(text: string) {
  const matches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g);
  return (matches ?? []).map((value) => value.toLowerCase());
}

function normalizeEmailDraft(emailDraft: string): {
  emailDraft: string;
  changed: boolean;
} {
  let next = emailDraft.trim();
  let changed = false;

  if (!/^subject:/i.test(next)) {
    next = `Subject: Transcript Follow-up\n\n${next}`;
    changed = true;
  }

  if (!/please review before sending\.?$/im.test(next)) {
    next = `${next}\n\nPlease review before sending.`;
    changed = true;
  }

  return { emailDraft: next, changed };
}

export function runSafetyCheck(input: SafetyInput): SafetyResult {
  const issues: string[] = [];
  let fallbackUsed = false;

  const transcript = input.transcript.trim();
  let summary = input.summary.trim();
  let taskList = input.taskList.map((item) => item.trim()).filter(Boolean);
  const emailNormalized = normalizeEmailDraft(input.emailDraft);

  if (emailNormalized.changed) {
    fallbackUsed = true;
  }

  if (!transcript) {
    issues.push("Transcript is empty.");
  }

  if (!summary) {
    issues.push("Summary is empty.");
  }

  const sentenceCount = countSentences(summary);
  if (sentenceCount > 3) {
    summary = summary
      .split(/(?<=[.!?])\s+/)
      .slice(0, 3)
      .join(" ")
      .trim();
    fallbackUsed = true;
  }

  taskList = taskList.map((item) => {
    let normalized = item;

    if (normalized.length > 140) {
      normalized = `${normalized.slice(0, 137).trim()}...`;
      fallbackUsed = true;
    }

    if (!ACTION_PREFIX_REGEX.test(normalized)) {
      normalized = `Follow up: ${normalized}`;
      fallbackUsed = true;
    }

    return normalized;
  });

  if (hasExplicitRequest(transcript) && taskList.length < 1) {
    issues.push("Transcript contains explicit requests but no action items were extracted.");
  }

  const transcriptEntities = new Set(extractPotentialEntities(transcript));
  const taskEntities = extractPotentialEntities(taskList.join("\n"));

  const foreignEntities = taskEntities.filter(
    (entity) => !transcriptEntities.has(entity),
  );

  if (foreignEntities.length > 0) {
    issues.push("Action items may introduce entities not present in the transcript.");
  }

  if (!emailNormalized.emailDraft.trim()) {
    issues.push("Email draft is empty.");
  }

  return {
    ok: issues.length === 0,
    fallbackUsed,
    issues,
    normalized: {
      summary,
      taskList,
      emailDraft: emailNormalized.emailDraft,
    },
  };
}
