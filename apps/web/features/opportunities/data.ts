/**
 * Opportunities is a preview-only surface (no backend Opportunity domain model exists yet —
 * see docs/project_plans/uplift/audit-digest.md#home-plays-opps, API[no]: Opportunity entity,
 * Deal Health scoring, AI recommendation ranking, Team activity, Artifact Pack composition).
 * Everything below is local seed data for the preview UI only.
 */

export type OpportunityRecord = {
  id: string;
  name: string;
  status: string;
  amount: string;
  closeDate: string;
  daysToClose: number;
  stage: string;
  tags: string[];
  team: string[];
  dealHealth: { score: number; engagement: string; budget: string; competition: string; timeline: string };
  customer: string;
  industry: string;
  regions: string;
  owner: string;
  solutionArea: string;
  decisionCriteria: string;
  painPoints: string;
};

export const opportunity: OpportunityRecord = {
  id: "acme-global-expansion",
  name: "ACME Global Expansion",
  status: "Active",
  amount: "$4.2M",
  closeDate: "Sep 30, 2026",
  daysToClose: 76,
  stage: "Solution Design",
  tags: ["Global Manufacturing", "IT Transformation", "Multi-Region", "RFP", "Executive Sponsor"],
  team: ["Sarah Chen", "Alex Kim", "Priya Raman", "Jordan Lee", "Taylor Morgan"],
  dealHealth: { score: 78, engagement: "High", budget: "Confirmed", competition: "Moderate", timeline: "On Track" },
  customer: "ACME Corporation",
  industry: "Global Manufacturing",
  regions: "NA, EMEA, APAC",
  owner: "Sarah Chen",
  solutionArea: "Digital Workplace",
  decisionCriteria: "Security, Scalability, Total Cost of Ownership",
  painPoints: "Legacy systems, siloed data, slow time to market"
};

export const activityFeed: Array<{ who: string; action: string; when: string; detail?: string }> = [
  { who: "Michael Torres", action: "added a comment", when: "55m ago", detail: "Let's lead with the ROI case study for similar deals." },
  { who: "Priya Nair", action: "uploaded 3 files", when: "2h ago" },
  { who: "You", action: "opened the Executive Expansion Play", when: "2h ago" }
];

export const aiRecommendations: Array<{ title: string; detail: string; impact: string }> = [
  { title: "Lead with ROI & Outcomes", detail: "Top performing opener in 7 similar wins.", impact: "+92% impact" },
  { title: "Address Security Early", detail: "High buyer priority surfaced in the RFP.", impact: "+88% impact" },
  { title: "Show Global Scale", detail: "Relevant to multi-region deployment needs.", impact: "+85% impact" }
];

export const topPlays: Array<{ title: string; detail: string; match: number; best?: boolean }> = [
  { title: "Global Expansion Framework", detail: "Proven framework for multi-region deployments. Used in 9 wins.", match: 82, best: true },
  { title: "Secure & Scalable Platform", detail: "Emphasizes security, reliability, and scale. Used in 6 wins.", match: 87 },
  { title: "Total Economic Impact", detail: "Quantifies business value and cost savings. Used in 4 wins, 72% win rate.", match: 81 }
];

export const topSlides: Array<{ rank: number; title: string; source: string; relevance: number; lastUsed: string }> = [
  { rank: 1, title: "Executive Summary", source: "Digital Transformation", relevance: 92, lastUsed: "May 12, 2026" },
  { rank: 2, title: "Business Impact", source: "ACME Manufacturing Win", relevance: 89, lastUsed: "Apr 28, 2026" },
  { rank: 3, title: "Solution Overview", source: "Digital Workplace Deck", relevance: 87, lastUsed: "Apr 22, 2026" },
  { rank: 4, title: "Security & Compliance", source: "Security Deep Dive", relevance: 84, lastUsed: "Apr 20, 2026" },
  { rank: 5, title: "Implementation Plan", source: "Global Deployment Playbook", relevance: 79, lastUsed: "Apr 18, 2026" }
];

export const savedMaterials: Array<{ title: string; detail: string; match: number }> = [
  { title: "ACME Manufacturing Case Study", detail: "PDF · 2.4 MB", match: 94 },
  { title: "Global ROI Calculator", detail: "XLSX · 180 KB", match: 91 },
  { title: "Customer Testimonial Video", detail: "MP4 · 45 MB", match: 88 },
  { title: "Total Cost of Ownership", detail: "PPTX · 3.8 MB", match: 84 },
  { title: "Executive Briefing Note", detail: "DOCX · 232 KB", match: 80 }
];

export const playBuilderSections: Array<{ title: string; detail: string; active?: boolean }> = [
  { title: "Executive Summary", detail: "1 slide" },
  { title: "Business Impact", detail: "2 slides" },
  { title: "Solution Overview", detail: "Drop here", active: true },
  { title: "Security & Compliance", detail: "1 slide" },
  { title: "Implementation Approach", detail: "2 slides" },
  { title: "Next Steps", detail: "1 slide" }
];

export const playBuilderContent: Array<{ title: string; detail: string; match: number }> = [
  { title: "Solution Overview · Title Slide", detail: "PPTX Slide · v3.2", match: 94 },
  { title: "Platform Capabilities", detail: "PPTX Slide · v2.7", match: 90 },
  { title: "Integration Ecosystem", detail: "PPTX Slide · v1.5", match: 88 },
  { title: "Global Scale & Performance", detail: "PPTX Slide · v2.1", match: 86 },
  { title: "Innovation Roadmap", detail: "PPTX Slide · v1.2", match: 84 },
  { title: "Customer Logos", detail: "PPTX Slide · v4.0", match: 85 }
];

export function dealHealthTone(value: string): "ok" | "warn" | "neutral" {
  if (value === "High" || value === "Confirmed" || value === "On Track") return "ok";
  if (value === "Moderate") return "warn";
  return "neutral";
}

export function matchTone(value: number): "good" | "mid" | "low" {
  if (value >= 85) return "good";
  if (value >= 70) return "mid";
  return "low";
}
