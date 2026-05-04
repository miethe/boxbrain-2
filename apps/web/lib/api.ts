import { reviewItems, storyboardSections } from "@/features/demo/data";

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
export type LinkSource = "manual" | "ai" | "hybrid";
export type ContentUnitListMode = "families" | "variants";

export type Taxonomy = {
  offerings?: string[];
  technologies?: string[];
  sectors?: string[];
  geos?: string[];
  stages?: string[];
  audiences?: string[];
  purposes?: string[];
  useCases?: string[];
  tags?: string[];
  locales?: string[];
  visualStyles?: string[];
  [key: string]: unknown;
};

export type StatusChips = {
  approvalState: ApprovalState;
  freshnessState: FreshnessState;
  isCanonical?: boolean;
  isRestricted?: boolean;
  linkSource?: LinkSource;
  [key: string]: unknown;
};

export type PageEnvelope<T> = {
  items: T[];
  nextCursor?: string | null;
};

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
  [key: string]: unknown;
};

export type ContentUnitVariant = {
  id: string;
  familyId: string;
  variantLabel: string;
  variantType?: string;
  variantDimensions?: Record<string, unknown>;
  isCanonical: boolean;
  linkedBy?: LinkSource;
  linkedConfidence?: number | null;
  latestVersionId?: string | null;
  latestVersion?: ContentUnitVersion | null;
  [key: string]: unknown;
};

export type ContentUnitFamilyCard = {
  id: string;
  familyTitle: string;
  conceptualSummary?: string | null;
  unitType: string;
  canonicalPreviewUri?: string | null;
  variantCount?: number;
  versionCount?: number;
  taxonomy?: Taxonomy;
  statusChips?: StatusChips;
  [key: string]: unknown;
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
  [key: string]: unknown;
};

export type Comment = {
  id: string;
  kind: string;
  targetType: string;
  targetId: string;
  anchor?: Record<string, unknown>;
  parentCommentId?: string | null;
  body: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type Note = {
  id: string;
  targetType: string;
  targetId: string;
  title?: string | null;
  body: string;
  noteType: string;
  isPinned: boolean;
  createdAt?: string;
  [key: string]: unknown;
};

export type ContentUnitFamilyDetail = ContentUnitFamilyCard & {
  variants?: ContentUnitVariant[];
  notes?: Note[];
};

export type ContentUnitVersionDetail = ContentUnitVersion & {
  extractedText?: string | null;
  speakerNotes?: string | null;
  provenance?: ProvenanceRecord;
  comments?: Comment[];
  notes?: Note[];
};

export type SearchResultItem = {
  objectType: string;
  objectId: string;
  resultGrain: "family" | "variant" | "version" | "block" | "work_product" | "play";
  title: string;
  summary?: string | null;
  previewUri?: string | null;
  score: number;
  explanationChips?: string[];
  statusChips?: StatusChips;
  [key: string]: unknown;
};

export type SearchProfile = "general" | "executive" | "technical" | "opportunity" | "duplicate_review" | "similarity_review" | "approved_only";
export type SearchResultMode = "auto" | "families" | "variants" | "versions";

export type SearchRequest = {
  query: string;
  profile?: SearchProfile;
  objectTypes?: string[];
  filters?: Record<string, unknown>;
  resultMode?: SearchResultMode;
  limit?: number;
};

export type AskRequest = SearchRequest & {
  context?: Record<string, unknown>;
};

export type SearchResponse = {
  query: string;
  interpretedIntent?: string | null;
  items: SearchResultItem[];
  debug?: Record<string, unknown> | null;
};

export type ContentUnitWhereUsedReference = {
  objectType: string;
  objectId: string;
  title?: string;
  orderIndex?: number;
  slotId?: string;
  [key: string]: unknown;
};

export type WorkProductFamilyCard = {
  id: string;
  title: string;
  artifactType: string;
  summary?: string | null;
  previewUri?: string | null;
  variantCount?: number;
  versionCount?: number;
  statusChips?: StatusChips;
  [key: string]: unknown;
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
  [key: string]: unknown;
};

export type ListContentUnitFamiliesInput = {
  cursor?: string;
  limit?: number;
  mode?: ContentUnitListMode;
  approvalState?: ApprovalState;
  freshnessState?: FreshnessState;
};

export type CreateCommentInput = {
  kind: "review_comment" | "persistent_comment" | "note_discussion";
  targetType: string;
  targetId: string;
  anchor?: Record<string, unknown>;
  parentCommentId?: string | null;
  body: string;
};

export type CreateNoteInput = {
  targetType: string;
  targetId: string;
  title?: string | null;
  body: string;
  noteType?: string;
  isPinned?: boolean;
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

function queryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
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

export async function listContentUnitFamilies(input: ListContentUnitFamiliesInput = {}): Promise<PageEnvelope<ContentUnitFamilyCard>> {
  return requestJson<PageEnvelope<ContentUnitFamilyCard>>(
    `/api/content-units/families${queryString({
      cursor: input.cursor,
      limit: input.limit,
      mode: input.mode,
      approvalState: input.approvalState,
      freshnessState: input.freshnessState
    })}`
  );
}

export async function getContentUnitFamily(familyId: string): Promise<ContentUnitFamilyDetail> {
  return requestJson<ContentUnitFamilyDetail>(`/api/content-units/families/${encodeURIComponent(familyId)}`);
}

export async function listContentUnitVariants(familyId: string): Promise<PageEnvelope<ContentUnitVariant>> {
  return requestJson<PageEnvelope<ContentUnitVariant>>(`/api/content-units/families/${encodeURIComponent(familyId)}/variants`);
}

export async function listContentUnitVersions(variantId: string): Promise<PageEnvelope<ContentUnitVersion>> {
  return requestJson<PageEnvelope<ContentUnitVersion>>(`/api/content-units/variants/${encodeURIComponent(variantId)}/versions`);
}

export async function getContentUnitVersion(versionId: string): Promise<ContentUnitVersionDetail> {
  return requestJson<ContentUnitVersionDetail>(`/api/content-units/versions/${encodeURIComponent(versionId)}`);
}

export async function setContentUnitCanonicalVariant(variantId: string, reason?: string): Promise<ContentUnitVariant> {
  return requestJson<ContentUnitVariant>(`/api/content-units/variants/${encodeURIComponent(variantId)}/canonical`, {
    method: "POST",
    json: reason ? { reason } : {}
  });
}

export async function updateContentUnitApproval(versionId: string, approvalState: ApprovalState, notes?: string): Promise<ContentUnitVersion> {
  return requestJson<ContentUnitVersion>(`/api/content-units/versions/${encodeURIComponent(versionId)}/approval`, {
    method: "PATCH",
    json: notes ? { approvalState, notes } : { approvalState }
  });
}

export async function updateContentUnitFreshness(versionId: string, freshnessState: FreshnessState, notes?: string): Promise<ContentUnitVersion> {
  return requestJson<ContentUnitVersion>(`/api/content-units/versions/${encodeURIComponent(versionId)}/freshness`, {
    method: "PATCH",
    json: notes ? { freshnessState, notes } : { freshnessState }
  });
}

export async function listSimilarContentUnits(versionId: string): Promise<SearchResultItem[]> {
  return requestJson<SearchResultItem[]>(`/api/content-units/${encodeURIComponent(versionId)}/similar`);
}

export async function listContentUnitWhereUsed(versionId: string): Promise<ContentUnitWhereUsedReference[]> {
  return requestJson<ContentUnitWhereUsedReference[]>(`/api/content-units/${encodeURIComponent(versionId)}/where-used`);
}

export async function searchBoxBrain(input: SearchRequest): Promise<SearchResponse> {
  return requestJson<SearchResponse>("/api/search", {
    method: "POST",
    json: input
  });
}

export async function askBoxBrain(input: AskRequest): Promise<SearchResponse> {
  return requestJson<SearchResponse>("/api/ask", {
    method: "POST",
    json: input
  });
}

export async function listComments(targetType?: string, targetId?: string): Promise<Comment[]> {
  return requestJson<Comment[]>(
    `/api/comments${queryString({
      targetType,
      targetId
    })}`
  );
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  return requestJson<Comment>("/api/comments", {
    method: "POST",
    json: input
  });
}

export async function listNotes(targetType?: string, targetId?: string): Promise<Note[]> {
  return requestJson<Note[]>(
    `/api/notes${queryString({
      targetType,
      targetId
    })}`
  );
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return requestJson<Note>("/api/notes", {
    method: "POST",
    json: input
  });
}

export async function listWorkProductFamilies(): Promise<PageEnvelope<WorkProductFamilyCard>> {
  return requestJson<PageEnvelope<WorkProductFamilyCard>>("/api/work-products/families");
}

export const boxbrainApi = {
  listContentFamilies: listContentUnitFamilies,
  listContentUnitFamilies,
  getContentUnitFamily,
  listContentUnitVariants,
  listContentUnitVersions,
  getContentUnitVersion,
  setContentUnitCanonicalVariant,
  updateContentUnitApproval,
  updateContentUnitFreshness,
  listSimilarContentUnits,
  listContentUnitWhereUsed,
  searchBoxBrain,
  askBoxBrain,
  listComments,
  createComment,
  listNotes,
  createNote,
  listWorkProducts: listWorkProductFamilies,
  listWorkProductFamilies,
  listReviews: () => apiFetch("/api/reviews/items", { items: reviewItems }),
  getStoryboard: () =>
    apiFetch("/api/storyboards/sb-cloud-modernization", {
      id: "sb-cloud-modernization",
      title: "Cloud Modernization Executive Storyboard",
      sections: storyboardSections
    }),
  ask: (query: string) => askBoxBrain({ query }),
  uploadArtifact,
  listIngestionJobs,
  getIngestionJob,
  retryIngestionJob,
  getWorkProductVersion
};
