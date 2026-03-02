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
