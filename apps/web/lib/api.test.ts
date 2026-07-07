import { afterEach, describe, expect, it, vi } from "vitest";
import { boxbrainApi, normalizeIngestionJobsResponse, normalizeReviewAction, normalizeReviewItemsResponse, type IngestionJob, type ReviewItem } from "./api";

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

describe("admin api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches pilot readiness health from the typed Admin endpoint", async () => {
    const health = {
      status: "ok",
      ingestion: {
        totalJobs: 2,
        statusCounts: { complete: 1, failed: 1 },
        failedJobs: 1
      },
      queue: {
        status: "healthy",
        adapter: "NoopIngestionQueue"
      },
      catalog: {
        contentUnitFamilies: 2,
        contentUnitVersions: 4,
        workProductVersions: 1,
        contentBlocks: 1,
        storyboards: 1
      },
      reviewAudit: {
        reviewItems: 2,
        openReviewItems: 1,
        auditEvents: 3
      },
      composition: {
        contentBlocks: 1,
        storyboards: 1
      },
      searchEval: {
        status: "pass",
        totalCases: 3,
        passedCases: 3,
        failedCases: 0
      }
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => health
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.getAdminHealth()).resolves.toEqual(health);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/admin/health", expect.objectContaining({ cache: "no-store" }));
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

  it("walks all ContentUnit family pages with the returned cursor", async () => {
    const family1 = {
      id: "family-1",
      familyTitle: "Cloud ROI",
      unitType: "slide"
    };
    const family2 = {
      id: "family-2",
      familyTitle: "Platform overview",
      unitType: "slide"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [family1], nextCursor: "cursor-page-2" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [family2], nextCursor: null }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listAllContentUnitFamilies({ mode: "families" })).resolves.toEqual([family1, family2]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/content-units/families?limit=100&mode=families",
      "http://localhost:8000/api/content-units/families?cursor=cursor-page-2&limit=100&mode=families"
    ]);
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

  it("posts search and ask requests to live retrieval endpoints", async () => {
    const response = {
      query: "cloud roi",
      interpretedIntent: "approved content",
      items: [
        {
          objectType: "content_unit_family",
          objectId: "00000000-0000-4000-8000-000000000101",
          resultGrain: "family",
          title: "Cloud ROI",
          score: 0.92,
          explanationChips: ["matched cloud"],
          statusChips: {
            approvalState: "approved",
            freshnessState: "fresh"
          }
        }
      ],
      debug: { filteredRestrictedCount: 1 }
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => response })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...response, interpretedIntent: "natural_language_retrieval" }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      boxbrainApi.searchBoxBrain({
        query: "cloud roi",
        profile: "executive",
        objectTypes: ["content_unit", "work_product"],
        filters: { approvalState: "approved", freshnessState: "fresh" },
        resultMode: "families",
        limit: 10
      })
    ).resolves.toEqual(response);
    await expect(boxbrainApi.askBoxBrain({ query: "cloud roi", context: { savedSearch: false } })).resolves.toMatchObject({
      interpretedIntent: "natural_language_retrieval"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "cloud roi",
          profile: "executive",
          objectTypes: ["content_unit", "work_product"],
          filters: { approvalState: "approved", freshnessState: "fresh" },
          resultMode: "families",
          limit: 10
        })
      })
    );
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get("content-type")).toBe("application/json");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/ask",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "cloud roi", context: { savedSearch: false } })
      })
    );
  });
});

describe("composition api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches and creates ContentBlocks through typed endpoints", async () => {
    const block = {
      id: "block-1",
      familyId: "block-family-1",
      title: "Ordered ROI block",
      blockType: "sequence",
      approvalState: "draft",
      members: [{ id: "member-1", memberType: "content_unit_version", memberId: "version-1", orderIndex: 0, isRequired: true }],
      createdAt: "2026-05-05T10:00:00.000Z"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [block], nextCursor: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => block })
      .mockResolvedValueOnce({ ok: true, json: async () => block });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listContentBlocks()).resolves.toEqual({ items: [block], nextCursor: null });
    await expect(boxbrainApi.getContentBlock("block/1")).resolves.toEqual(block);
    await expect(
      boxbrainApi.createContentBlock({
        title: "Ordered ROI block",
        members: [{ memberType: "content_unit_version", memberId: "version-1", orderIndex: 0 }]
      })
    ).resolves.toEqual(block);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/content-blocks",
      "http://localhost:8000/api/content-blocks/block%2F1",
      "http://localhost:8000/api/content-blocks"
    ]);
    expect((fetchMock.mock.calls[2][1] as RequestInit).body).toBe(
      JSON.stringify({
        title: "Ordered ROI block",
        blockType: "sequence",
        members: [{ memberType: "content_unit_version", memberId: "version-1", orderIndex: 0, isRequired: true }]
      })
    );
  });

  it("uses Storyboard sections, slots, snapshots, diagnostics, and comments endpoints", async () => {
    const storyboard = {
      id: "storyboard-1",
      mode: "work_product",
      title: "Board story",
      currentSnapshotId: null,
      createdAt: "2026-05-05T10:00:00.000Z",
      updatedAt: "2026-05-05T10:00:00.000Z",
      draftSections: []
    };
    const section = { id: "section-1", storyboardId: "storyboard-1", title: "Economic case", orderIndex: 0, slots: [] };
    const slot = {
      id: "slot-1",
      sectionId: "section-1",
      slotType: "content_block",
      selectedObjectType: "content_block_version",
      selectedObjectId: "block-1",
      orderIndex: 0,
      isRequired: true,
      aiRecommended: false
    };
    const snapshot = {
      id: "snapshot-1",
      storyboardId: "storyboard-1",
      versionLabel: "v1",
      approvalState: "draft",
      narrativeScore: 0.9,
      sections: [{ ...section, slots: [slot] }],
      createdAt: "2026-05-05T10:05:00.000Z"
    };
    const diagnostics = { narrativeScore: 0.9, warnings: [] };
    const comment = {
      id: "comment-1",
      kind: "persistent_comment",
      targetType: "storyboard",
      targetId: "storyboard-1",
      anchor: { slotId: "slot-1" },
      body: "Tighten this slot.",
      status: "open"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [storyboard], nextCursor: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => storyboard })
      .mockResolvedValueOnce({ ok: true, json: async () => section })
      .mockResolvedValueOnce({ ok: true, json: async () => slot })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...slot, purpose: "Updated" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [snapshot] })
      .mockResolvedValueOnce({ ok: true, json: async () => snapshot })
      .mockResolvedValueOnce({ ok: true, json: async () => snapshot })
      .mockResolvedValueOnce({ ok: true, json: async () => diagnostics })
      .mockResolvedValueOnce({ ok: true, json: async () => comment });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listStoryboards()).resolves.toEqual({ items: [storyboard], nextCursor: null });
    await expect(boxbrainApi.getStoryboard("storyboard-1")).resolves.toEqual(storyboard);
    await expect(boxbrainApi.createStoryboardSection("storyboard-1", { title: "Economic case", orderIndex: 0 })).resolves.toEqual(section);
    await expect(
      boxbrainApi.createStoryboardSlot("section-1", {
        slotType: "content_block",
        selectedObjectType: "content_block_version",
        selectedObjectId: "block-1"
      })
    ).resolves.toEqual(slot);
    await expect(boxbrainApi.updateStoryboardSlot("slot-1", { purpose: "Updated" })).resolves.toMatchObject({ purpose: "Updated" });
    await expect(boxbrainApi.listStoryboardSnapshots("storyboard-1")).resolves.toEqual([snapshot]);
    await expect(boxbrainApi.createStoryboardSnapshot("storyboard-1", "v1")).resolves.toEqual(snapshot);
    await expect(boxbrainApi.getStoryboardSnapshot("snapshot-1")).resolves.toEqual(snapshot);
    await expect(boxbrainApi.analyzeStoryboard("storyboard-1")).resolves.toEqual(diagnostics);
    await expect(
      boxbrainApi.createComment({
        kind: "persistent_comment",
        targetType: "storyboard",
        targetId: "storyboard-1",
        anchor: { slotId: "slot-1" },
        body: "Tighten this slot."
      })
    ).resolves.toEqual(comment);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/storyboards",
      "http://localhost:8000/api/storyboards/storyboard-1",
      "http://localhost:8000/api/storyboards/storyboard-1/sections",
      "http://localhost:8000/api/storyboard-sections/section-1/slots",
      "http://localhost:8000/api/storyboard-slots/slot-1",
      "http://localhost:8000/api/storyboards/storyboard-1/snapshots",
      "http://localhost:8000/api/storyboards/storyboard-1/snapshots",
      "http://localhost:8000/api/storyboard-snapshots/snapshot-1",
      "http://localhost:8000/api/storyboards/storyboard-1/analyze",
      "http://localhost:8000/api/comments"
    ]);
  });
});

describe("review api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const reviewItem: ReviewItem = {
    id: "review-1",
    queueType: "variant_candidate",
    status: "open",
    confidence: 0.86,
    rationale: "AI detected shared ROI structure.",
    suggestedAction: "mark_variant",
    targetRefs: [{ objectType: "content_unit_version", id: "version-1" }],
    source: "ai",
    createdAt: "2026-05-04T12:00:00.000Z"
  };

  it("normalizes review item envelopes and suggested actions", () => {
    expect(normalizeReviewItemsResponse([reviewItem])).toEqual([reviewItem]);
    expect(normalizeReviewItemsResponse({ items: [reviewItem] })).toEqual([reviewItem]);
    expect(normalizeReviewItemsResponse({ items: [] })).toEqual([]);
    expect(normalizeReviewAction("mark_variant")).toBe("mark-variant");
    expect(normalizeReviewAction("request-changes")).toBe("request-changes");
    expect(normalizeReviewAction("deprecate")).toBe("accept");
    expect(normalizeReviewAction("unknown")).toBe("accept");
  });

  it("fetches queues, items, and detail from typed review endpoints", async () => {
    const queues = [{ queueType: "variant_candidate", openCount: 1, oldestCreatedAt: "2026-05-04T12:00:00.000Z" }];
    const detail = {
      ...reviewItem,
      compareObjects: [{ title: "Executive ROI", versionId: "version-1" }],
      auditPreview: { action: "review_mark_variant", requiresRole: "reviewer" }
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => queues })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [reviewItem], nextCursor: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => detail });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.listReviewQueues()).resolves.toEqual(queues);
    await expect(boxbrainApi.listReviewItems({ queueType: "variant_candidate", status: "open", limit: 25 })).resolves.toEqual({
      items: [reviewItem],
      nextCursor: null
    });
    await expect(boxbrainApi.getReviewItem("review-1")).resolves.toEqual(detail);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/reviews/queues",
      "http://localhost:8000/api/reviews/items?queueType=variant_candidate&status=open&limit=25",
      "http://localhost:8000/api/reviews/items/review-1"
    ]);
  });

  it("posts review actions with reviewer reasons", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviewItemId: "review-1", auditEventId: "audit-1", status: "accepted" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.runReviewAction("review-1", "mark-variant", { reason: "Looks like a reusable variant." })).resolves.toEqual({
      reviewItemId: "review-1",
      auditEventId: "audit-1",
      status: "accepted"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/reviews/items/review-1/mark-variant",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Looks like a reusable variant." })
      })
    );
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get("content-type")).toBe("application/json");
  });

  it("uses the compatible generation route when available", async () => {
    const generated = [
      {
        id: "candidate-1",
        queueType: "similarity_candidate",
        title: "Similarity Candidate",
        confidence: 0.8,
        targetRefs: [],
        compareObjects: [],
        suggestedAction: "accept",
        source: "ai",
        createdAt: "2026-05-04T12:00:00.000Z",
        persisted: true
      }
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: generated })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boxbrainApi.generateReviewCandidates({ queueType: "similarity_candidate", limit: 4 })).resolves.toEqual(generated);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/reviews/candidates/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ queueType: "similarity_candidate", limit: 4 })
      })
    );
  });

  it("falls back to a search-based candidate scan when generation is not implemented", async () => {
    const searchResponse = {
      query: "similar",
      interpretedIntent: "review_candidates",
      items: [
        {
          objectType: "content_unit_version",
          objectId: "version-1",
          resultGrain: "version",
          title: "Executive ROI",
          score: 0.84,
          previewUri: "/seed/roi.png",
          statusChips: { approvalState: "approved", freshnessState: "fresh" }
        },
        {
          objectType: "content_unit_version",
          objectId: "version-2",
          resultGrain: "version",
          title: "Board ROI",
          score: 0.81,
          statusChips: { approvalState: "review", freshnessState: "aging" }
        },
        {
          objectType: "content_unit_version",
          objectId: "version-3",
          resultGrain: "version",
          title: "Restricted ROI",
          score: 0.9,
          statusChips: { approvalState: "approved", freshnessState: "fresh", isRestricted: true }
        }
      ]
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ detail: "Not found" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => searchResponse });
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await boxbrainApi.generateReviewCandidates({ queueType: "similarity_candidate", query: "similar", limit: 6 });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      queueType: "similarity_candidate",
      source: "search_helper",
      persisted: false,
      suggestedAction: "mark-similar"
    });
    expect(candidates[0].targetRefs.map((target) => target.id)).toEqual(["version-1", "version-2"]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["http://localhost:8000/api/reviews/candidates/generate", "http://localhost:8000/api/search"]);
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toMatchObject({
      query: "similar",
      profile: "similarity_review",
      objectTypes: ["content_unit", "work_product"],
      resultMode: "versions",
      limit: 6
    });
  });
});
