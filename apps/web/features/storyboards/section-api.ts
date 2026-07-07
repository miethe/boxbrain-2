// apps/web/lib/api.ts is a shared file this wave may not edit (screen-wave-brief.md hard rules),
// but the backend already exposes PATCH /api/storyboard-sections/{section_id} (see
// audit-digest.md ## storyboard API[partial]: "Section reorder / update ... apps/web/lib/api.ts has
// no updateStoryboardSection client function"). This module adds a narrowly-scoped client for that
// one endpoint, mirroring the request conventions already used in lib/api.ts (same base-url
// resolution, same default x-boxbrain-user header) without touching the shared file.
import type { StoryboardSection } from "@/lib/api";

const SERVER_API_BASE_URL = process.env.BOXBRAIN_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type UpdateStoryboardSectionInput = {
  title: string;
  summary?: string | null;
  orderIndex?: number;
};

export async function updateStoryboardSection(sectionId: string, input: UpdateStoryboardSectionInput): Promise<StoryboardSection> {
  const response = await fetch(`${SERVER_API_BASE_URL}/api/storyboard-sections/${encodeURIComponent(sectionId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-boxbrain-user": "admin"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string; error?: string; message?: string };
      message = payload.detail ?? payload.error ?? payload.message ?? message;
    } catch {
      // Keep the status-based message when the error response is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as StoryboardSection;
}
