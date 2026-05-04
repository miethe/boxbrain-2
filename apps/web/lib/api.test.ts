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
    vi.unstubAllGlobals();
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

  it("fetches work product version detail from the API-backed endpoint", async () => {
    const detail = {
      id: "00000000-0000-4000-8000-000000000402",
      title: "Executive Cloud Modernization Overview",
      artifactType: "deck",
      versionNumber: "v1.0",
      approvalState: "review",
      previewUri: "/seed/work-products/executive-overview.png",
      filmstrip: [],
      provenance: {
        id: "00000000-0000-4000-8000-000000000301",
        originType: "imported",
        sourceRefs: ["Executive Overview Deck"]
      }
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => detail
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.getWorkProductVersion(detail.id)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/work-products/versions/00000000-0000-4000-8000-000000000402",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});

describe("content unit graph api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists ContentUnit families with graph filters", async () => {
    const response = {
      items: [
        {
          id: "family-1",
          familyTitle: "Cloud ROI",
          unitType: "slide",
          statusChips: {
            approvalState: "approved",
            freshnessState: "fresh"
          }
        }
      ],
      nextCursor: "next"
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      boxbrainApi.listContentUnitFamilies({
        cursor: "cursor-1",
        limit: 25,
        mode: "families",
        approvalState: "approved",
        freshnessState: "fresh"
      })
    ).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/content-units/families?cursor=cursor-1&limit=25&mode=families&approvalState=approved&freshnessState=fresh",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("fetches family, variant versions, and version detail endpoints", async () => {
    const family = {
      id: "family-1",
      familyTitle: "Cloud ROI",
      unitType: "slide",
      variants: []
    };
    const versions = {
      items: [
        {
          id: "version-1",
          variantId: "variant-1",
          versionNumber: "v1",
          approvalState: "review",
          freshnessState: "aging"
        }
      ]
    };
    const versionDetail = {
      ...versions.items[0],
      provenance: {
        id: "prov-1",
        originType: "imported"
      },
      comments: [],
      notes: []
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => family })
      .mockResolvedValueOnce({ ok: true, json: async () => versions })
      .mockResolvedValueOnce({ ok: true, json: async () => versionDetail });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.getContentUnitFamily("family 1")).resolves.toEqual(family);
    await expect(boxbrainApi.listContentUnitVersions("variant/1")).resolves.toEqual(versions);
    await expect(boxbrainApi.getContentUnitVersion("version/1")).resolves.toEqual(versionDetail);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/content-units/families/family%201",
      "http://localhost:8000/api/content-units/variants/variant%2F1/versions",
      "http://localhost:8000/api/content-units/versions/version%2F1"
    ]);
  });

  it("fetches similar, where-used, comments, and notes for a version", async () => {
    const similar = [{ objectId: "version-2", objectType: "content_unit_version", resultGrain: "version", title: "Similar", score: 0.91 }];
    const whereUsed = [{ objectType: "storyboard", objectId: "storyboard-1", title: "Board story" }];
    const comments = [{ id: "comment-1", kind: "persistent_comment", targetType: "content_unit_version", targetId: "version-1", body: "Check metric.", status: "open" }];
    const notes = [{ id: "note-1", targetType: "content_unit_version", targetId: "version-1", body: "Use for board.", noteType: "usage_guidance", isPinned: true }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => similar })
      .mockResolvedValueOnce({ ok: true, json: async () => whereUsed })
      .mockResolvedValueOnce({ ok: true, json: async () => comments })
      .mockResolvedValueOnce({ ok: true, json: async () => notes });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listSimilarContentUnits("version-1")).resolves.toEqual(similar);
    await expect(boxbrainApi.listContentUnitWhereUsed("version-1")).resolves.toEqual(whereUsed);
    await expect(boxbrainApi.listComments("content_unit_version", "version-1")).resolves.toEqual(comments);
    await expect(boxbrainApi.listNotes("content_unit_version", "version-1")).resolves.toEqual(notes);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/content-units/version-1/similar",
      "http://localhost:8000/api/content-units/version-1/where-used",
      "http://localhost:8000/api/comments?targetType=content_unit_version&targetId=version-1",
      "http://localhost:8000/api/notes?targetType=content_unit_version&targetId=version-1"
    ]);
  });

  it("writes governance requests with json bodies", async () => {
    const canonicalVariant = {
      id: "variant-1",
      familyId: "family-1",
      variantLabel: "Executive",
      isCanonical: true
    };
    const approvedVersion = {
      id: "version-1",
      variantId: "variant-1",
      versionNumber: "v1",
      approvalState: "approved",
      freshnessState: "fresh"
    };
    const staleVersion = {
      ...approvedVersion,
      freshnessState: "stale"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => canonicalVariant })
      .mockResolvedValueOnce({ ok: true, json: async () => approvedVersion })
      .mockResolvedValueOnce({ ok: true, json: async () => staleVersion });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.setContentUnitCanonicalVariant("variant-1", "Curator selected.")).resolves.toEqual(canonicalVariant);
    await expect(boxbrainApi.updateContentUnitApproval("version-1", "approved", "Approved for reuse.")).resolves.toEqual(approvedVersion);
    await expect(boxbrainApi.updateContentUnitFreshness("version-1", "stale", "Metric expired.")).resolves.toEqual(staleVersion);

    const [, canonicalInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, approvalInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const [, freshnessInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(canonicalInit.method).toBe("POST");
    expect(canonicalInit.body).toBe(JSON.stringify({ reason: "Curator selected." }));
    expect(new Headers(canonicalInit.headers).get("content-type")).toBe("application/json");
    expect(approvalInit.method).toBe("PATCH");
    expect(approvalInit.body).toBe(JSON.stringify({ approvalState: "approved", notes: "Approved for reuse." }));
    expect(freshnessInit.method).toBe("PATCH");
    expect(freshnessInit.body).toBe(JSON.stringify({ freshnessState: "stale", notes: "Metric expired." }));
  });
});
