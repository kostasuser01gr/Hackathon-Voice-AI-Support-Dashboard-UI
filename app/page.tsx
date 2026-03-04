import { ErrorBoundary } from "@/components/error-boundary";
import { VoiceActionDashboard } from "@/components/voice-action-dashboard";
import { getPublicConfig } from "@/lib/publicConfig";

export default function HomePage() {
  const publicConfig = getPublicConfig();

  return (
    <ErrorBoundary>
      <VoiceActionDashboard publicConfig={publicConfig} />
    </ErrorBoundary>
  );
}
