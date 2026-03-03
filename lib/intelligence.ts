import type { SessionIndex, SessionUrgency } from "@/lib/session-meta";

export type TranscriptInsight = {
  entities: string[];
  topics: string[];
  openLoops: string[];
};

const TOPIC_HINTS: Array<{ name: string; regex: RegExp }> = [
  { name: "support", regex: /\b(ticket|customer|issue|support|escalation)\b/i },
  { name: "sales", regex: /\b(deal|pipeline|proposal|quote|pricing|renewal)\b/i },
  { name: "engineering", regex: /\b(bug|release|deploy|incident|rollback|qa)\b/i },
  { name: "operations", regex: /\b(schedule|handoff|owner|deadline|follow up)\b/i },
  { name: "travel", regex: /\b(itinerary|booking|flight|hotel|client trip)\b/i },
];

export function deriveTranscriptInsights(
  transcript: string,
  tasks: string[],
): TranscriptInsight {
  const entities = Array.from(
    new Set(
      (transcript.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 2),
    ),
  ).slice(0, 8);

  const topics = TOPIC_HINTS.filter((topic) => topic.regex.test(transcript)).map(
    (topic) => topic.name,
  );

  const openLoops = tasks.filter((task) =>
    /\b(follow up|confirm|schedule|review|send|prepare|investigate)\b/i.test(task),
  );

  return {
    entities,
    topics,
    openLoops,
  };
}

function deriveUrgency(text: string): SessionUrgency {
  if (/\b(urgent|asap|immediately|today|critical|sev1|p0)\b/i.test(text)) {
    return "high";
  }

  if (/\b(this week|soon|follow up|priority|deadline|tomorrow)\b/i.test(text)) {
    return "medium";
  }

  return "low";
}

export function deriveSessionIndex(transcript: string, tasks: string[]): SessionIndex {
  const insight = deriveTranscriptInsights(transcript, tasks);
  const urgency = deriveUrgency(`${transcript}\n${tasks.join("\n")}`);

  return {
    entities: insight.entities,
    topics: insight.topics,
    openLoops: insight.openLoops,
    openLoopsCount: insight.openLoops.length,
    urgency,
  };
}
