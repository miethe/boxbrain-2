import { Sparkles } from "lucide-react";

/** Honest "coming soon" callout: there is no ContentUnit-scoped AI-insight generation endpoint
 * (see audit-digest.md API NEEDS), so no generated insight copy is fabricated here. */
export function AiInsightsCard() {
  return (
    <div className="ai-panel">
      <h4>
        <Sparkles size={14} aria-hidden="true" /> AI Insights
        <span className="beta">BETA</span>
      </h4>
      <div className="ai-body">Generated insights for this ContentUnit aren&rsquo;t available yet. This panel will surface AI-authored narrative and improvement suggestions once that pipeline ships.</div>
    </div>
  );
}
