import { describe, expect, it } from "vitest";
import type { AdminHealth, IngestionJob } from "@/lib/api";
import type { AuditEvent } from "./audit-events-api";
import {
  auditActionLabel,
  auditActionTone,
  auditTargetHref,
  buildGuardrailChecks,
  buildReadinessChecks,
  buildStageRows,
  describeStage,
  formatAge,
  formatDateTime,
  getHealthStages,
  getSearchIndexEmbeddings,
  humanizeKey,
  normalizeRecentFailures,
  normalizeSearchEvalCases,
  summarizeJobs
} from "./lib";

function makeJob(overrides: Partial<IngestionJob> = {}): IngestionJob {
  return {
    id: "job-1",
    status: "queued",
    stage: "queued",
    artifactType: "deck",
    title: "Board update",
    uploadMetadata: {},
    retryCount: 0,
    createdAt: "2026-05-03T10:00:00.000Z",
    updatedAt: "2026-05-03T10:00:00.000Z",
    ...overrides
  };
}

function makeHealth(overrides: Partial<AdminHealth> = {}): AdminHealth {
  return {
    status: "ok",
    ingestion: { totalJobs: 1, failedJobs: 0 },
    queue: { status: "healthy", adapter: "NoopIngestionQueue", queueName: null },
    catalog: { contentUnitFamilies: 9, contentUnitVersions: 16, contentBlocks: 2, storyboards: 1 },
    searchIndex: {
      backend: "memory",
      searchableContentUnitVersions: 16,
      restrictedContentUnitVersions: 1,
      restrictedWorkProductVersions: 0,
      restrictedContentBlocks: 0
    },
    reviewAudit: { auditEvents: 3, openReviewItems: 4 },
    composition: { contentBlocks: 2, storyboards: 1 },
    searchEval: { status: "pass", totalCases: 3, passedCases: 3, failedCases: 0, cases: [] },
    ...overrides
  };
}

describe("summarizeJobs", () => {
  it("counts jobs by status and reports the oldest active job's age", () => {
    const now = Date.now();
    const jobs = [
      makeJob({ id: "a", status: "queued", createdAt: new Date(now - 2 * 60_000).toISOString() }),
      makeJob({ id: "b", status: "running", createdAt: new Date(now - 90 * 60_000).toISOString() }),
      makeJob({ id: "c", status: "failed" }),
      makeJob({ id: "d", status: "complete" })
    ];

    const summary = summarizeJobs(jobs);

    expect(summary).toMatchObject({ queued: 1, running: 1, failed: 1, complete: 1 });
    // "a" (2 minutes old) is more recent than "b" (90 minutes old), so the oldest active job is "b".
    expect(summary.oldestActiveAge).toBe("1 hour old");
  });

  it("reports no active job when nothing is queued or running", () => {
    const summary = summarizeJobs([makeJob({ status: "complete" })]);
    expect(summary.oldestActiveAge).toBeNull();
  });
});

describe("formatAge", () => {
  it("buckets elapsed time into minutes then hours", () => {
    expect(formatAge(new Date(Date.now() - 10_000))).toBe("Less than 1 minute old");
    expect(formatAge(new Date(Date.now() - 5 * 60_000))).toBe("5 minutes old");
    expect(formatAge(new Date(Date.now() - 3 * 60 * 60_000))).toBe("3 hours old");
  });
});

describe("buildReadinessChecks", () => {
  it("flags empty catalog/composition/ingestion/audit telemetry as warn", () => {
    const health = makeHealth({ catalog: {}, composition: {}, reviewAudit: {}, ingestion: {} });
    const checks = buildReadinessChecks(health, [], summarizeJobs([]));

    expect(checks.every((check) => check.tone === "warn")).toBe(true);
  });

  it("flags failed ingestion jobs as danger even when other telemetry is healthy", () => {
    const health = makeHealth();
    const jobs = [makeJob({ status: "failed" })];
    const checks = buildReadinessChecks(health, jobs, summarizeJobs(jobs));

    const ingestionCheck = checks.find((check) => check.label === "Ingestion telemetry");
    expect(ingestionCheck?.tone).toBe("danger");
  });
});

describe("buildGuardrailChecks", () => {
  it("derives every check from live AdminHealth fields, not fabricated copy", () => {
    const checks = buildGuardrailChecks(makeHealth());

    expect(checks).toHaveLength(4);
    expect(checks.find((check) => check.label === "Restricted-content tracking")?.value).toBe("1 flagged");
    expect(checks.find((check) => check.label === "Governance audit trail")?.value).toBe("3 events");
    expect(checks.find((check) => check.label === "Ingestion & queue health")?.tone).toBe("ok");
  });

  it("turns the queue/ingestion check danger when failed jobs are present", () => {
    const checks = buildGuardrailChecks(makeHealth({ ingestion: { totalJobs: 2, failedJobs: 1 } }));
    expect(checks.find((check) => check.label === "Ingestion & queue health")?.tone).toBe("danger");
  });

  it("surfaces the real restricted-exclusion eval note instead of static marketing copy", () => {
    const checks = buildGuardrailChecks(
      makeHealth({
        searchEval: {
          status: "pass",
          totalCases: 1,
          passedCases: 1,
          failedCases: 0,
          cases: [
            {
              name: "restricted_viewer_exclusion",
              query: "client-sensitive operating margin bridge",
              role: "viewer",
              resultCount: 1,
              topScore: 0.42,
              passed: true,
              notes: ["Restricted candidates excluded from viewer search."]
            }
          ]
        }
      })
    );

    expect(checks.find((check) => check.label === "Search relevance & restricted-exclusion eval")?.hint).toBe(
      "Restricted candidates excluded from viewer search."
    );
  });
});

describe("getHealthStages / buildStageRows", () => {
  it("reads the `stages` field the AdminHealth TS type omits, off the raw payload", () => {
    const health = {
      ...makeHealth(),
      stages: {
        currentStageCounts: { complete: 1 },
        completedStageCounts: { validated: 1, rendered: 1 },
        failedStageCounts: { extracted: 1 },
        stagesWithFailures: ["extracted"]
      }
    } as AdminHealth;

    const stages = getHealthStages(health);
    expect(stages.currentStageCounts).toEqual({ complete: 1 });

    const rows = buildStageRows(stages);
    const extractedRow = rows.find((row) => row.key === "extracted");
    expect(extractedRow?.hasFailure).toBe(true);
    expect(extractedRow?.failed).toBe(1);
    expect(rows.find((row) => row.key === "complete")?.label).toBe("Complete");
  });

  it("normalizes to the empty case when `stages` is absent from the payload", () => {
    const stages = getHealthStages(makeHealth());
    expect(stages).toEqual({ currentStageCounts: {}, completedStageCounts: {}, failedStageCounts: {}, stagesWithFailures: [] });
    expect(buildStageRows(stages)).toEqual([]);
  });
});

describe("describeStage", () => {
  it("returns a known label/hint for architecture-doc and runtime stage vocabularies", () => {
    expect(describeStage("extract_text").label).toBe("Extract text");
    expect(describeStage("extracted").label).toBe("Extract text");
  });

  it("falls back to a humanized label for unknown stage keys", () => {
    expect(describeStage("some_future_stage").label).toBe("Some future stage");
  });
});

describe("normalizeSearchEvalCases", () => {
  it("defaults missing/malformed fields instead of throwing", () => {
    const cases = normalizeSearchEvalCases([{ name: "case_a", passed: true }, "not-an-object", undefined]);
    expect(cases).toHaveLength(3);
    expect(cases[0]).toMatchObject({ name: "case_a", passed: true, resultCount: 0, notes: [] });
    expect(cases[1].name).toBe("unnamed_case");
  });

  it("returns an empty array for a non-array input", () => {
    expect(normalizeSearchEvalCases(undefined)).toEqual([]);
  });
});

describe("normalizeRecentFailures", () => {
  it("keeps only entries with a jobId and defaults the rest", () => {
    const failures = normalizeRecentFailures([{ jobId: "job-9", stage: "extract_text", retryCount: 2 }, { stage: "no id" }]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ jobId: "job-9", stage: "extract_text", retryCount: 2, title: null });
  });
});

describe("getSearchIndexEmbeddings", () => {
  it("narrows the index-signature-typed embeddings fields to real numbers/records", () => {
    const result = getSearchIndexEmbeddings({
      backend: "memory",
      embeddings: 16,
      embeddingTargetCounts: { content_unit_version: 16 }
    } as AdminHealth["searchIndex"]);

    expect(result).toEqual({ embeddings: 16, embeddingTargetCounts: { content_unit_version: 16 } });
  });

  it("defaults to zero/empty when the fields are absent", () => {
    expect(getSearchIndexEmbeddings(undefined)).toEqual({ embeddings: 0, embeddingTargetCounts: {} });
  });
});

describe("audit action helpers", () => {
  it("humanizes unknown audit actions and maps known ones to a scannable tone", () => {
    expect(auditActionLabel("mark_variant")).toBe("Mark variant");
    expect(auditActionTone("mark_variant")).toBe("ai");
    expect(auditActionTone("upload_rejected")).toBe("danger");
    expect(auditActionTone("some_new_action")).toBe("neutral");
  });
});

describe("humanizeKey", () => {
  it("splits snake_case and capitalizes the first letter", () => {
    expect(humanizeKey("upload_import")).toBe("Upload import");
    expect(humanizeKey("createdContentUnitVersionIds")).toBe("Created Content Unit Version Ids");
  });
});

describe("formatDateTime", () => {
  it("returns a placeholder for missing/invalid values", () => {
    expect(formatDateTime(undefined)).toBe("Unknown time");
    expect(formatDateTime("not-a-date")).toBe("Unknown time");
  });

  it("formats a valid ISO timestamp", () => {
    expect(formatDateTime("2026-07-07T15:44:27.233674Z")).toMatch(/Jul/);
  });
});

describe("auditTargetHref", () => {
  function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
    return {
      id: "event-1",
      action: "approve",
      actorId: "admin",
      targetType: "content_unit_version",
      targetId: "00000000-0000-4000-8000-000000000301",
      priorState: {},
      newState: {},
      metadata: {},
      createdAt: "2026-07-07T15:44:27.233674Z",
      ...overrides
    };
  }

  it("links known object types to their detail routes", () => {
    expect(auditTargetHref(makeEvent())).toBe("/content-units/00000000-0000-4000-8000-000000000301");
    expect(auditTargetHref(makeEvent({ targetType: "work_product_version", targetId: "wp-1" }))).toBe("/work-products/wp-1");
  });

  it("returns null instead of a fabricated link for unknown target types", () => {
    expect(auditTargetHref(makeEvent({ targetType: "ingestion_job" }))).toBeNull();
  });
});
