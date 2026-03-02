type RedactionResult = {
  output: string;
  redactions: number;
};

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

export function redactPiiText(input: string): RedactionResult {
  let redactions = 0;
  let next = input;

  next = next.replace(EMAIL_REGEX, () => {
    redactions += 1;
    return "[redacted-email]";
  });

  next = next.replace(PHONE_REGEX, () => {
    redactions += 1;
    return "[redacted-phone]";
  });

  return {
    output: next,
    redactions,
  };
}

export function sanitizeForRetention(input: string, maxChars = 2000) {
  return input.slice(0, maxChars).trim();
}
