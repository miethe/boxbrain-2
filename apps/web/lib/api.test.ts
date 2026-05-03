import { afterEach, describe, expect, it, vi } from "vitest";
import { boxbrainApi, normalizeIngestionJobsResponse, type IngestionJob } from "./api";

const queuedJob: IngestionJob = {
  id: "job-1",
  status: "queued",
  stage: "queued",
  artifactType: "deck",
  title: "Board update",
  uploadMetadata: {},
  retryCount: 0,
  createdAt: "2026-05-03T10:00:00.000Z",
  updatedAt: "2026-05-03T10:00:00.000Z"
};

describe("ingestion api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes list responses from array and item envelopes", () => {
    expect(normalizeIngestionJobsResponse([queuedJob])).toEqual([queuedJob]);
    expect(normalizeIngestionJobsResponse({ items: [queuedJob] })).toEqual([queuedJob]);
    expect(normalizeIngestionJobsResponse({ jobs: [queuedJob] })).toEqual([queuedJob]);
    expect(normalizeIngestionJobsResponse({})).toEqual([]);
  });

  it("lists ingestion jobs from the API-backed endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [queuedJob] })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listIngestionJobs()).resolves.toEqual({ items: [queuedJob] });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/ingestion-jobs", expect.objectContaining({ cache: "no-store" }));
  });

  it("uploads multipart form data without forcing a json content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => queuedJob
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["slides"], "board-update.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    });

    await expect(boxbrainApi.uploadArtifact({ file, artifactType: "deck", title: "Board update" })).resolves.toEqual(queuedJob);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(new Headers(init.headers).get("x-boxbrain-user")).toBe("admin");
    expect(new Headers(init.headers).has("content-type")).toBe(false);
  });

  it("retries ingestion jobs through the API-backed endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...queuedJob, retryCount: 1 })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.retryIngestionJob("job-1")).resolves.toEqual({ ...queuedJob, retryCount: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/ingestion-jobs/job-1/retry",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
  });
});
