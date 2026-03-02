const PROFANITY_PATTERNS = [
  /\bfuck\b/gi,
  /\bshit\b/gi,
  /\basshole\b/gi,
  /\bbitch\b/gi,
  /\bdamn\b/gi,
];

export function neutralizeProfanity(text: string): {
  sanitized: string;
  replacedCount: number;
} {
  let replacedCount = 0;

  const sanitized = PROFANITY_PATTERNS.reduce((value, pattern) => {
    return value.replace(pattern, (match) => {
      replacedCount += 1;
      return `[redacted-${match.length}]`;
    });
  }, text);

  return { sanitized, replacedCount };
}
