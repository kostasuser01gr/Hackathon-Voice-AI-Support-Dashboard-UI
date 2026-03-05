export function retrieveContext(transcript: string): string {
  const lowerTranscript = transcript.toLowerCase();
  const contextChunks: string[] = [];

  // Simulate querying a Vector DB / Knowledge Base based on keywords
  if (lowerTranscript.includes("password") || lowerTranscript.includes("login")) {
    contextChunks.push("[Knowledge Base: Password resets require identity verification via support@company.com. Do not reset manually.]");
  }

  if (lowerTranscript.includes("refund") || lowerTranscript.includes("charge")) {
    contextChunks.push("[Playbook: Refunds under $50 can be approved immediately. Over $50 requires manager escalation.]");
  }

  if (lowerTranscript.includes("bug") || lowerTranscript.includes("error") || lowerTranscript.includes("crash")) {
    contextChunks.push("[Jira Integration: Known ongoing incident INC-102 regarding login crashes. ETA for fix is 2 hours.]");
  }

  if (lowerTranscript.includes("vip") || lowerTranscript.includes("enterprise")) {
    contextChunks.push("[CRM Integration: User belongs to an Enterprise Tier account. Prioritize as High Urgency and use a white-glove tone.]");
  }

  return contextChunks.join("\n");
}
