import { contentFamilies, reviewItems, storyboardSections, workProducts } from "@/features/demo/data";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type IngestionJobStatus = "queued" | "running" | "failed" | "complete";

export type ArtifactType = "deck" | "brief" | "document" | "one_pager" | "whitepaper" | "proposal" | "other";

export type IngestionUploadMetadata = {
  createdContentUnitVersionIds?: string[];
  contentUnitVersionIds?: string[];
  slideCount?: number;
  warnings?: string[];
  stageTelemetry?: Record<string, unknown>;
  stageTimestamps?: Record<string, unknown>;
  outputSummary?: unknown;
  workProductVersionId?: string;
  [key: string]: unknown;
};

export type IngestionOutputSummary = {
  slideCount?: number;
  renderCount?: number;
  embeddingCount?: number;
  createdContentUnitVersionIds?: string[];
  workProductVersionId?: string | null;
  warnings?: string[];
};

export type IngestionJob = {
  id: string;
  status: IngestionJobStatus;
  stage: string;
  artifactType: ArtifactType;
  title?: string | null;
  originalObjectId?: string | null;
  workProductVersionId?: string | null;
  uploadMetadata: IngestionUploadMetadata;
  outputSummary?: IngestionOutputSummary | null;
  stageTelemetry?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type UploadArtifactInput = {
  file: File;
  artifactType?: ArtifactType;
  title?: string;
  taxonomy?: Record<string, unknown>;
};

export type ApprovalState = "draft" | "review" | "approved" | "deprecated" | "archived";
export type FreshnessState = "fresh" | "aging" | "stale";

export type ContentUnitVersion = {
  id: string;
  variantId: string;
  versionNumber: string;
  renderUri?: string | null;
  thumbnailUri?: string | null;
  summary?: string | null;
  approvalState: ApprovalState;
  freshnessState?: FreshnessState;
  qualityScore?: number | null;
  usageScore?: number | null;
  sourceOrderIndex?: number | null;
  createdAt?: string;
};

export type ProvenanceRecord = {
  id: string;
  originType: string;
  sourceSystem?: string | null;
  parentRefs?: Array<Record<string, unknown>>;
  sourceRefs?: string[];
  modelInfo?: string | null;
  pipelineVersion?: string | null;
  createdAt?: string;
};

export type WorkProductVersionDetail = {
  id: string;
  title: string;
  artifactType: string;
  versionNumber: string;
  approvalState: ApprovalState;
  previewUri?: string | null;
  filmstrip: ContentUnitVersion[];
  provenance: ProvenanceRecord;
};

type RequestJsonOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function defaultHeaders(initHeaders?: HeadersInit, hasJsonBody = false) {
  const headers = new Headers(initHeaders);
  headers.set("x-boxbrain-user", headers.get("x-boxbrain-user") ?? "admin");
  if (hasJsonBody && !headers.has("content-type")) headers.set("content-type", "application/json");
  return headers;
}

async function apiFetch<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: defaultHeaders(init?.headers, Boolean(init?.body)),
      cache: "no-store"
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function requestJson<T>(path: string, init: RequestJsonOptions = {}): Promise<T> {
  const { json, headers, ...requestInit } = init;
  const body = json === undefined ? requestInit.body : JSON.stringify(json);
  const response = await fetch(apiUrl(path), {
    ...requestInit,
    body,
    headers: defaultHeaders(headers, json !== undefined),
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
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export function normalizeIngestionJobsResponse(payload: IngestionJob[] | { items?: IngestionJob[]; jobs?: IngestionJob[] }): IngestionJob[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.jobs ?? [];
}

export async function uploadArtifact(input: UploadArtifactInput): Promise<IngestionJob> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("artifactType", input.artifactType ?? "deck");
  if (input.title?.trim()) formData.append("title", input.title.trim());
  if (input.taxonomy) formData.append("taxonomy", JSON.stringify(input.taxonomy));

  return requestJson<IngestionJob>("/api/uploads", {
    method: "POST",
    body: formData
  });
}

export async function listIngestionJobs(): Promise<IngestionJobsResult> {
  const payload = await requestJson<IngestionJob[] | { items?: IngestionJob[]; jobs?: IngestionJob[] }>("/api/ingestion-jobs");
  return { items: normalizeIngestionJobsResponse(payload) };
}

export async function getIngestionJob(id: string): Promise<IngestionJob> {
  return requestJson<IngestionJob>(`/api/ingestion-jobs/${encodeURIComponent(id)}`);
}

export async function retryIngestionJob(id: string): Promise<IngestionJob> {
  return requestJson<IngestionJob>(`/api/ingestion-jobs/${encodeURIComponent(id)}/retry`, {
    method: "POST"
  });
}

export async function getWorkProductVersion(id: string): Promise<WorkProductVersionDetail> {
  return requestJson<WorkProductVersionDetail>(`/api/work-products/versions/${encodeURIComponent(id)}`);
}

export type IngestionJobsResult = {
  items: IngestionJob[];
};

export const boxbrainApi = {
  listContentFamilies: () => apiFetch("/api/content-units/families", { items: contentFamilies }),
  listWorkProducts: () => apiFetch("/api/work-products/families", { items: workProducts }),
  listReviews: () => apiFetch("/api/reviews/items", { items: reviewItems }),
  getStoryboard: () =>
    apiFetch("/api/storyboards/sb-cloud-modernization", {
      id: "sb-cloud-modernization",
      title: "Cloud Modernization Executive Storyboard",
      sections: storyboardSections
    }),
  ask: (query: string) =>
    apiFetch("/api/ask", {
      answer: `Seeded answer for "${query}". Results are grouped by family and filtered by visibility before ranking.`,
      items: contentFamilies.filter((item) => !item.restricted)
    }),
  uploadArtifact,
  listIngestionJobs,
  getIngestionJob,
  retryIngestionJob,
  getWorkProductVersion
};
