import { expect, test, type APIRequestContext } from "@playwright/test";

const API_BASE_URL = `http://127.0.0.1:${process.env.BOXBRAIN_API_E2E_PORT ?? "18080"}`;

test("exercises API-backed pilot core surfaces without copy-coupled assertions", async ({ page, request }) => {
  const adminHealth = await getJson<{
    status: string;
    catalog: { contentUnitVersions: number; contentBlocks: number; storyboards: number };
    composition: { contentBlocks: number; storyboards: number };
  }>(request, "/api/admin/health");
  expect(adminHealth.status).toBe("ok");
  expect(adminHealth.catalog.contentUnitVersions).toBeGreaterThan(0);

  const askResponse = await request.post(`${API_BASE_URL}/api/ask`, {
    headers: adminHeaders(),
    data: {
      query: "cloud roi",
      profile: "executive",
      objectTypes: ["content_unit", "work_product"],
      filters: { approvalState: "approved" },
      limit: 5
    }
  });
  expect(askResponse.status()).toBe(200);
  const askPayload = await askResponse.json();
  expect(Array.isArray(askPayload.items)).toBe(true);
  expect(askPayload.items.length).toBeGreaterThan(0);

  await page.goto("/ask");
  await expect(page.getByTestId("ask-page")).toBeVisible();
  await page.getByTestId("ask-query-input").fill("cloud roi");
  await page.getByTestId("ask-search-submit").click();
  await expect(page.getByTestId("search-result-card").first()).toBeVisible();

  const contentFamilies = await getJson<{ items: Array<{ id: string }> }>(request, "/api/content-units/families");
  expect(contentFamilies.items.length).toBeGreaterThan(0);
  await page.goto("/library");
  await expect(page.getByTestId("library-page")).toBeVisible();
  await expect(page.getByTestId("library-family-card").first()).toBeVisible();
  await expect(page.getByTestId("library-work-products")).toBeVisible();

  const ingestionJobs = await getJson<Array<unknown> | { items?: Array<unknown>; jobs?: Array<unknown> }>(request, "/api/ingestion-jobs");
  const visibleJobs = Array.isArray(ingestionJobs) ? ingestionJobs : ingestionJobs.items ?? ingestionJobs.jobs ?? [];
  expect(visibleJobs.length).toBeGreaterThanOrEqual(0);
  await page.goto("/ingestion");
  await expect(page.getByTestId("ingestion-page")).toBeVisible();
  await expect(page.getByTestId("ingestion-status-metrics")).toBeVisible();
  await expect(page.getByTestId("ingestion-job-list")).toBeVisible();

  const reviewQueues = await getJson<Array<{ queueType: string }>>(request, "/api/reviews/queues");
  expect(Array.isArray(reviewQueues)).toBe(true);
  await page.goto("/reviews");
  await expect(page.getByTestId("reviews-page")).toBeVisible();
  await expect(page.getByTestId("reviews-queue-list")).toBeVisible();
  await expect(page.getByTestId("reviews-item-list")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByTestId("admin-page")).toBeVisible();
  await expect(page.getByTestId("admin-health-metrics")).toBeVisible();
  await expect(page.getByTestId("admin-readiness-checks")).toBeVisible();
  await expect(page.getByTestId("admin-ingestion-observability")).toBeVisible();

  const contentBlocks = await getJson<{ items: Array<{ id: string }> }>(request, "/api/content-blocks");
  expect(contentBlocks.items.length).toBeGreaterThan(0);
  await page.goto(`/content-blocks/${contentBlocks.items[0].id}`);
  await expect(page.getByTestId("content-block-page")).toBeVisible();

  const storyboards = await getJson<{ items: Array<{ id: string }> }>(request, "/api/storyboards");
  expect(storyboards.items.length).toBeGreaterThan(0);
  await page.goto(`/storyboards/${storyboards.items[0].id}`);
  await expect(page.getByTestId("storyboard-page")).toBeVisible();
});

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: adminHeaders()
  });
  expect(response.status()).toBe(200);
  return response.json();
}

function adminHeaders() {
  return {
    "x-boxbrain-user": "admin",
    "x-boxbrain-role": "admin"
  };
}
