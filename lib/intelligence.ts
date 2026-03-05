import type { SessionIndex, SessionUrgency, SessionSentiment } from "@/lib/session-meta";

export type TranscriptInsight = {
  entities: string[];
  topics: string[];
  openLoops: string[];
};

const TOPIC_HINTS: Array<{ name: string; regex: RegExp }> = [
  { name: "support", regex: /\b(ticket|customer|issue|support|escalation|help|broken|error)\b/i },
  { name: "sales", regex: /\b(deal|pipeline|proposal|quote|pricing|renewal|contract|discount|revenue)\b/i },
  { name: "engineering", regex: /\b(bug|release|deploy|incident|rollback|qa|feature|sprint|code|fix)\b/i },
  { name: "operations", regex: /\b(schedule|handoff|owner|deadline|follow up|meeting|sync|logistics)\b/i },
  { name: "travel", regex: /\b(itinerary|booking|flight|hotel|client trip|travel|reimbursement)\b/i },
  { name: "security", regex: /\b(password|access|login|permission|auth|breach|exploit|compliance)\b/i },
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
  ).slice(0, 12);

  const topics = TOPIC_HINTS.filter((topic) => topic.regex.test(transcript)).map(
    (topic) => topic.name,
  );

  const openLoops = tasks.filter((task) =>
    /\b(follow up|confirm|schedule|review|send|prepare|investigate|deploy|monitor|check|verify)\b/i.test(task),
  );

  return {
    entities,
    topics,
    openLoops,
  };
}

function deriveUrgency(text: string): SessionUrgency {
  const highPatterns = /\b(urgent|asap|immediately|today|critical|sev1|p0|emergency|broken|down|crashed)\b/i;
  const mediumPatterns = /\b(this week|soon|follow up|priority|deadline|tomorrow|required|need|waiting)\b/i;

  if (highPatterns.test(text)) {
    return "high";
  }

  if (mediumPatterns.test(text)) {
    return "medium";
  }

  return "low";
}

function deriveSentiment(text: string): SessionSentiment {
  const positiveWords = /\b(great|awesome|excellent|perfect|love|thanks|thank you|happy|good|resolved|success|fixed)\b/i;
  const negativeWords = /\b(bad|terrible|broken|issue|error|failed|frustrated|angry|unhappy|slow|delay|crash|disappointed)\b/i;

  const posMatch = (text.match(positiveWords) || []).length;
  const negMatch = (text.match(negativeWords) || []).length;

  if (negMatch > posMatch) {
    return "negative";
  }

  if (posMatch > negMatch) {
    return "positive";
  }

  return "neutral";
}

export function deriveSessionIndex(transcript: string, tasks: string[]): SessionIndex {
  const insight = deriveTranscriptInsights(transcript, tasks);
  const combinedText = `${transcript}\n${tasks.join("\n")}`;
  const urgency = deriveUrgency(combinedText);
  const sentiment = deriveSentiment(transcript);

  return {
    entities: insight.entities,
    topics: insight.topics,
    openLoops: insight.openLoops,
    openLoopsCount: insight.openLoops.length,
    urgency,
    sentiment,
  };
}
