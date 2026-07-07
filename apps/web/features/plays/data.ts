/**
 * Plays is a preview-only surface (no backend Play domain model exists yet — see
 * docs/project_plans/uplift/audit-digest.md#home-plays-opps, API[no]: Play entity).
 * Every value below is local seed data for the preview UI; nothing here is fetched
 * from an API and nothing should ever be presented as live analytics.
 */

export type PlayCategory = "growth" | "expansion" | "cross-sell" | "retention";

export type PlayStepIcon = "meeting" | "workproduct" | "workshop" | "engagement" | "proposal";

export type PlayIconKey = "mountain" | "trending-up" | "rocket" | "shield" | "compass";

export type PlayStep = {
  icon: PlayStepIcon;
  title: string;
  type: string;
  description: string;
  duration: string;
};

export type PlayStats = {
  uses: number;
  winRate?: number;
  dealSize?: string;
  timeToValue?: string;
  adoption?: string;
};

export type PlayRecord = {
  id: string;
  title: string;
  category: PlayCategory;
  summary: string;
  tags: string[];
  stats: PlayStats;
  verified?: boolean;
  iconKey: PlayIconKey;
  gradient: string;
  owner: string;
  ownerRole: string;
  updated: string;
  audience: string;
  experience: string;
  dealSize: string;
  useCases: string[];
  whenToUse: string;
  successCriteria: string;
  steps: PlayStep[];
  similarPlayIds: string[];
};

export const playCategoryLabels: Record<PlayCategory, string> = {
  growth: "Growth",
  expansion: "Expansion",
  "cross-sell": "Cross-Sell",
  retention: "Retention"
};

export const plays: PlayRecord[] = [
  {
    id: "executive-expansion-play",
    title: "Executive Expansion Play",
    category: "expansion",
    summary:
      "Drive multi-product adoption and expand account value through executive alignment, business case expansion, and cross-functional engagement.",
    tags: ["Expansion", "Enterprise", "SaaS", "Multi-Product"],
    stats: { uses: 342, winRate: 68, dealSize: "$145K", timeToValue: "41 days", adoption: "89%" },
    verified: true,
    iconKey: "mountain",
    gradient: "linear-gradient(140deg,#7c3aed,#a855f7)",
    owner: "Sarah Chen",
    ownerRole: "VP, Customer Success",
    updated: "May 14, 2025",
    audience: "Account Executives, Customer Success Managers, Solutions Engineers",
    experience: "Mid to Senior",
    dealSize: "$100K+ ACV",
    useCases: ["Expand into new business units", "Increase seat count and usage", "Add complementary products", "Drive platform consolidation"],
    whenToUse: "When an account has strong product adoption and clear expansion potential but limited growth in the past 90 days.",
    successCriteria: "Expansion pipeline generated, executive sponsor engaged, and additional products or seats activated.",
    steps: [
      {
        icon: "meeting",
        title: "Executive Alignment",
        type: "Meeting",
        description: "Align on strategic priorities and expansion objectives with the executive sponsor.",
        duration: "7–10 days"
      },
      {
        icon: "workproduct",
        title: "Business Case Expansion",
        type: "Work Product",
        description: "Build and validate the expansion business case with quantified value.",
        duration: "5–7 days"
      },
      {
        icon: "workshop",
        title: "Solution Expansion Workshop",
        type: "Workshop",
        description: "Identify expansion opportunities and shape the multi-product solution.",
        duration: "7–10 days"
      },
      {
        icon: "engagement",
        title: "Stakeholder Engagement",
        type: "Engagement",
        description: "Activate cross-functional champions and address objections.",
        duration: "10–14 days"
      },
      {
        icon: "proposal",
        title: "Proposal & Close",
        type: "Proposal",
        description: "Present the proposal, finalize terms, and close the expansion.",
        duration: "7–10 days"
      }
    ],
    similarPlayIds: ["land-and-expand", "cross-sell-new-product", "account-growth-accelerator"]
  },
  {
    id: "land-and-expand",
    title: "Land and Expand",
    category: "expansion",
    summary: "Start with a focused initial win, then systematically expand footprint account by account.",
    tags: ["Expansion", "Land & Expand"],
    stats: { uses: 312, winRate: 61, adoption: "74%" },
    iconKey: "trending-up",
    gradient: "linear-gradient(140deg,#2563eb,#38bdf8)",
    owner: "Alex Kim",
    ownerRole: "Enterprise AE",
    updated: "Apr 30, 2025",
    audience: "Enterprise Account Executives",
    experience: "Mid to Senior",
    dealSize: "$50K+ ACV",
    useCases: ["Establish a beachhead team", "Prove value before scaling", "Build a reference inside the account"],
    whenToUse: "When entering a new account with a single team or a narrow initial use case.",
    successCriteria: "A second business unit is engaged within two quarters of the initial win.",
    steps: [
      { icon: "meeting", title: "Beachhead Discovery", type: "Meeting", description: "Identify the highest-friction team to land the first win.", duration: "3–5 days" },
      { icon: "workproduct", title: "Pilot Success Plan", type: "Work Product", description: "Define measurable pilot outcomes with the champion team.", duration: "5–7 days" },
      { icon: "engagement", title: "Cross-Team Expansion", type: "Engagement", description: "Introduce the win to adjacent teams and business units.", duration: "10–14 days" }
    ],
    similarPlayIds: ["executive-expansion-play", "account-growth-accelerator"]
  },
  {
    id: "cross-sell-new-product",
    title: "Cross-Sell New Product",
    category: "cross-sell",
    summary: "Introduce a complementary product line to existing customers using proven adoption signals.",
    tags: ["Cross-Sell", "Product Adoption"],
    stats: { uses: 278, winRate: 54, adoption: "63%" },
    iconKey: "rocket",
    gradient: "linear-gradient(140deg,#059669,#14b8a6)",
    owner: "Priya Raman",
    ownerRole: "Content Curator",
    updated: "Apr 22, 2025",
    audience: "Account Executives, Product Specialists",
    experience: "Mid",
    dealSize: "$25K+ ACV",
    useCases: ["Introduce a second product line", "Bundle pricing for existing customers"],
    whenToUse: "When usage data shows an account outgrowing their current product tier.",
    successCriteria: "A qualified cross-sell opportunity is created with product specialist support.",
    steps: [
      { icon: "meeting", title: "Usage Signal Review", type: "Meeting", description: "Review usage telemetry to identify cross-sell readiness.", duration: "2–3 days" },
      { icon: "workshop", title: "Product Fit Workshop", type: "Workshop", description: "Map the complementary product to the account's active use cases.", duration: "5–7 days" },
      { icon: "proposal", title: "Bundled Proposal", type: "Proposal", description: "Present a bundled proposal with adoption incentives.", duration: "7–10 days" }
    ],
    similarPlayIds: ["executive-expansion-play"]
  },
  {
    id: "account-growth-accelerator",
    title: "Account Growth Accelerator",
    category: "growth",
    summary: "A structured cadence of quarterly business reviews designed to compound account growth.",
    tags: ["Growth", "QBR"],
    stats: { uses: 195, winRate: 58, adoption: "81%" },
    iconKey: "rocket",
    gradient: "linear-gradient(140deg,#d97706,#f59e0b)",
    owner: "Taylor Morgan",
    ownerRole: "Admin",
    updated: "Apr 18, 2025",
    audience: "Customer Success Managers",
    experience: "Junior to Mid",
    dealSize: "$30K+ ACV",
    useCases: ["Structure quarterly business reviews", "Track growth commitments over time"],
    whenToUse: "When an account has a recurring QBR cadence but lacks a documented growth narrative.",
    successCriteria: "A documented growth plan is reviewed each quarter with the account team.",
    steps: [
      { icon: "meeting", title: "Growth Baseline Review", type: "Meeting", description: "Establish the current growth baseline with the account team.", duration: "2–3 days" },
      { icon: "workproduct", title: "Quarterly Growth Plan", type: "Work Product", description: "Draft a growth plan with milestones for the next two quarters.", duration: "5–7 days" }
    ],
    similarPlayIds: ["land-and-expand"]
  },
  {
    id: "competitive-battlecard-play",
    title: "Competitive Battlecard Play",
    category: "growth",
    summary: "Equip reps with objection handling and proof points for the most common competitive matchups.",
    tags: ["Growth", "Competitive"],
    stats: { uses: 231, winRate: 63, adoption: "77%" },
    iconKey: "shield",
    gradient: "linear-gradient(140deg,#334155,#64748b)",
    owner: "Jordan Lee",
    ownerRole: "Reviewer",
    updated: "Apr 12, 2025",
    audience: "Account Executives, Sales Engineers",
    experience: "Mid to Senior",
    dealSize: "$40K+ ACV",
    useCases: ["Respond to head-to-head competitive evaluations"],
    whenToUse: "When a competitor is actively engaged in a live evaluation.",
    successCriteria: "A documented win against a named competitor with reusable proof points.",
    steps: [
      { icon: "meeting", title: "Competitive Intake", type: "Meeting", description: "Capture the competitive landscape and evaluation criteria.", duration: "1–2 days" },
      { icon: "workshop", title: "Objection Handling Workshop", type: "Workshop", description: "Align the account team on objection responses and proof points.", duration: "3–5 days" }
    ],
    similarPlayIds: ["executive-expansion-play"]
  },
  {
    id: "technical-discovery-workshop",
    title: "Technical Discovery Workshop",
    category: "growth",
    summary: "A structured technical discovery motion to de-risk architecture decisions before proposal.",
    tags: ["Growth", "Technical"],
    stats: { uses: 168, winRate: 57, adoption: "69%" },
    iconKey: "compass",
    gradient: "linear-gradient(140deg,#0891b2,#38bdf8)",
    owner: "Alex Kim",
    ownerRole: "Solutions Architect",
    updated: "Apr 6, 2025",
    audience: "Solutions Engineers, Architects",
    experience: "Senior",
    dealSize: "$60K+ ACV",
    useCases: ["De-risk architecture ahead of a proposal"],
    whenToUse: "When technical stakeholders require architecture validation before commercial conversations proceed.",
    successCriteria: "A signed-off architecture path with named technical stakeholders.",
    steps: [
      { icon: "workshop", title: "Architecture Discovery", type: "Workshop", description: "Map current-state architecture and constraints with technical stakeholders.", duration: "3–5 days" },
      { icon: "workproduct", title: "Migration Path Draft", type: "Work Product", description: "Draft a phased migration path for technical sign-off.", duration: "5–7 days" }
    ],
    similarPlayIds: ["executive-expansion-play"]
  },
  {
    id: "renewal-risk-mitigation",
    title: "Renewal Risk Mitigation",
    category: "retention",
    summary: "Identify and address renewal risk signals before a contract enters its final quarter.",
    tags: ["Retention", "Renewal"],
    stats: { uses: 142, winRate: 71, adoption: "85%" },
    iconKey: "shield",
    gradient: "linear-gradient(140deg,#be123c,#fb7185)",
    owner: "Sarah Chen",
    ownerRole: "VP, Customer Success",
    updated: "Mar 30, 2025",
    audience: "Customer Success Managers",
    experience: "Mid to Senior",
    dealSize: "Any",
    useCases: ["De-risk an at-risk renewal"],
    whenToUse: "When usage or sentiment signals indicate renewal risk 120 days out.",
    successCriteria: "A documented save plan with an executive sponsor engaged.",
    steps: [
      { icon: "meeting", title: "Risk Signal Review", type: "Meeting", description: "Review usage and sentiment signals with the account team.", duration: "1–2 days" },
      { icon: "engagement", title: "Executive Save Motion", type: "Engagement", description: "Engage an executive sponsor to address the at-risk relationship.", duration: "7–10 days" }
    ],
    similarPlayIds: ["account-growth-accelerator"]
  },
  {
    id: "emea-modernization-variant",
    title: "EMEA Modernization Variant",
    category: "retention",
    summary: "A regionally adapted modernization narrative for EMEA data residency and compliance requirements.",
    tags: ["Retention", "EMEA"],
    stats: { uses: 96, winRate: 52, adoption: "58%" },
    iconKey: "compass",
    gradient: "linear-gradient(140deg,#4338ca,#818cf8)",
    owner: "Priya Raman",
    ownerRole: "Content Curator",
    updated: "Mar 22, 2025",
    audience: "EMEA Account Teams",
    experience: "Mid",
    dealSize: "€40K+ ACV",
    useCases: ["Address EMEA data residency requirements"],
    whenToUse: "When an EMEA account raises data residency or compliance concerns.",
    successCriteria: "A compliance-approved modernization narrative is delivered to the account.",
    steps: [
      { icon: "workshop", title: "Compliance Alignment", type: "Workshop", description: "Align the modernization narrative with EMEA compliance requirements.", duration: "5–7 days" }
    ],
    similarPlayIds: ["renewal-risk-mitigation"]
  }
];

export function getPlayCategoryCounts(): Record<"all" | PlayCategory, number> {
  const counts: Record<"all" | PlayCategory, number> = { all: plays.length, growth: 0, expansion: 0, "cross-sell": 0, retention: 0 };
  for (const play of plays) counts[play.category] += 1;
  return counts;
}

export function getPlayById(id: string): PlayRecord | undefined {
  return plays.find((play) => play.id === id);
}

export function getPlaysByCategory(category?: string): PlayRecord[] {
  if (!category || category === "all") return plays;
  return plays.filter((play) => play.category === category);
}

export function getSimilarPlays(play: PlayRecord): PlayRecord[] {
  return play.similarPlayIds.map((id) => getPlayById(id)).filter((item): item is PlayRecord => Boolean(item));
}
