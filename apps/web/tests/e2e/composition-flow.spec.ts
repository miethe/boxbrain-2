import { expect, test } from "@playwright/test";

const API_BASE_URL = `http://127.0.0.1:${process.env.BOXBRAIN_API_E2E_PORT ?? "18080"}`;
const ROI_EXEC_VERSION_ID = "00000000-0000-4000-8000-000000000301";
const ROI_BOARD_VERSION_ID = "00000000-0000-4000-8000-000000000302";
const RESTRICTED_VERSION_ID = "00000000-0000-4000-8000-000000000304";

test.describe.configure({ mode: "serial" });

test("composes a ContentBlock into a Storyboard slot and reloads an immutable snapshot", async ({ page, request }) => {
  const missingBlockId = crypto.randomUUID();
  await page.goto(`/content-blocks/${missingBlockId}`, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "ContentBlock not found" })).toBeVisible();
  await page.getByPlaceholder("Block title").fill("Milestone 5 validation block");
  await page.getByPlaceholder("Summary").fill("E2E-created reusable composition block.");
  await page
    .getByPlaceholder("One ContentUnit version UUID per line")
    .fill(`${ROI_BOARD_VERSION_ID}\n${ROI_EXEC_VERSION_ID}`);
  await page.getByRole("button", { name: "Create block" }).click();

  await expect(page.getByRole("heading", { name: "Milestone 5 validation block" })).toBeVisible();
  await expect(page.getByText("Ordered members")).toBeVisible();
  await expect(page.getByText("Approved executive ROI slide with margin lift and payback highlights.").first()).toBeVisible();
  await expect(page.getByText("Board version of the ROI case with scenario sensitivity and margin bridge.").first()).toBeVisible();
  const blockId = page.url().match(/\/content-blocks\/([^/?#]+)/)?.[1];
  expect(blockId).toBeTruthy();

  const missingStoryboardId = crypto.randomUUID();
  await page.goto(`/storyboards/${missingStoryboardId}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Storyboard not found" })).toBeVisible();
  await page.getByPlaceholder("Storyboard title").fill("Milestone 5 validation storyboard");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: "Milestone 5 validation storyboard" })).toBeVisible();
  const storyboardId = page.url().match(/\/storyboards\/([^/?#]+)/)?.[1];
  expect(storyboardId).toBeTruthy();

  const sectionResponse = await request.post(`${API_BASE_URL}/api/storyboards/${storyboardId}/sections`, {
    headers: adminHeaders(),
    data: {
      title: "Validation narrative",
      summary: "Created through the API-backed Storyboard endpoint.",
      orderIndex: 0
    }
  });
  expect(sectionResponse.status()).toBe(201);
  const section = await sectionResponse.json();

  const slotResponse = await request.post(`${API_BASE_URL}/api/storyboard-sections/${section.id}/slots`, {
    headers: adminHeaders(),
    data: {
      slotType: "content_block",
      selectedObjectType: "content_block_version",
      selectedObjectId: blockId,
      orderIndex: 0,
      purpose: "Reusable block slot"
    }
  });
  expect(slotResponse.status()).toBe(201);

  await page.goto(`/storyboards/${storyboardId}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Validation narrative" })).toBeVisible();
  await expect(page.getByText("Reusable block slot", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("content_block", { exact: true })).toBeVisible();
  await expect(page.getByText(blockId as string)).toBeVisible();
  await expect(page.getByText("100 narrative")).toBeVisible();

  const snapshotResponse = await request.post(`${API_BASE_URL}/api/storyboards/${storyboardId}/snapshots`, {
    headers: adminHeaders(),
    data: {
      versionLabel: "milestone-5-v1"
    }
  });
  expect(snapshotResponse.status()).toBe(200);
  const snapshot = await snapshotResponse.json();

  await page.goto(`/storyboards/${storyboardId}?snapshotId=${snapshot.id}`, { waitUntil: "networkidle" });
  await expect(page.getByText("Snapshot detail")).toBeVisible();
  await expect(page.getByText("milestone-5-v1").first()).toBeVisible();
  await expect(page.getByText("1 frozen sections · 1 frozen slots")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Milestone 5 validation storyboard" })).toBeVisible();
  await expect(page.getByText("Reusable block slot", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Snapshot detail")).toBeVisible();
  await expect(page.getByText("milestone-5-v1").first()).toBeVisible();
});

test("does not expose restricted compositions to viewer-scoped API reads", async ({ request }) => {
  const viewerHeaders = {
    "x-boxbrain-user": "viewer",
    "x-boxbrain-role": "viewer"
  };

  const restrictedBlockResponse = await request.post(`${API_BASE_URL}/api/content-blocks`, {
    headers: adminHeaders(),
    data: {
      title: "Restricted margin appendix block",
      members: [
        {
          memberType: "content_unit_version",
          memberId: RESTRICTED_VERSION_ID,
          orderIndex: 0,
          role: "restricted_source"
        }
      ]
    }
  });
  expect(restrictedBlockResponse.status()).toBe(201);
  const restrictedBlock = await restrictedBlockResponse.json();

  const viewerBlockResponse = await request.get(`${API_BASE_URL}/api/content-blocks/${restrictedBlock.id}`, {
    headers: viewerHeaders
  });
  expect(viewerBlockResponse.status()).toBe(404);
  await expect(viewerBlockResponse.text()).resolves.not.toContain("margin appendix");

  const storyboardResponse = await request.post(`${API_BASE_URL}/api/storyboards`, {
    headers: adminHeaders(),
    data: {
      title: "Restricted storyboard validation",
      mode: "work_product"
    }
  });
  expect(storyboardResponse.status()).toBe(201);
  const restrictedStoryboard = await storyboardResponse.json();

  const sectionResponse = await request.post(`${API_BASE_URL}/api/storyboards/${restrictedStoryboard.id}/sections`, {
    headers: adminHeaders(),
    data: {
      title: "Private economics",
      orderIndex: 0
    }
  });
  expect(sectionResponse.status()).toBe(201);
  const restrictedSection = await sectionResponse.json();

  const slotResponse = await request.post(`${API_BASE_URL}/api/storyboard-sections/${restrictedSection.id}/slots`, {
    headers: adminHeaders(),
    data: {
      slotType: "content_unit",
      selectedObjectType: "content_unit_version",
      selectedObjectId: RESTRICTED_VERSION_ID,
      orderIndex: 0,
      purpose: "Restricted source slot"
    }
  });
  expect(slotResponse.status()).toBe(201);

  const viewerStoryboardResponse = await request.get(`${API_BASE_URL}/api/storyboards/${restrictedStoryboard.id}`, {
    headers: viewerHeaders
  });
  expect(viewerStoryboardResponse.status()).toBe(404);
  await expect(viewerStoryboardResponse.text()).resolves.not.toContain("Private economics");
});

test("renders practical app-shell error states for malformed composition identifiers", async ({ page }) => {
  await page.goto("/content-blocks/not-a-uuid", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "ContentBlock request failed" })).toBeVisible();
  await expect(page.getByText("API error")).toBeVisible();

  await page.goto("/storyboards/not-a-uuid", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Storyboard request failed" })).toBeVisible();
  await expect(page.getByText("API error")).toBeVisible();
});

function adminHeaders() {
  return {
    "x-boxbrain-user": "admin",
    "x-boxbrain-role": "admin"
  };
}
