import { test, expect } from "@playwright/test";

/**
 * Club Settings E2E Tests
 *
 * Tests the club information page and API endpoint.
 */

test.describe("Club Settings", () => {
  test("club settings page loads with heading", async ({ page }) => {
    await page.goto("/settings/club");
    await expect(page.getByText("Club Information")).toBeVisible({
      timeout: 10000,
    });
  });

  test("club settings page shows Club Name field", async ({ page }) => {
    await page.goto("/settings/club");
    await expect(page.getByLabel("Club Name")).toBeVisible({ timeout: 10000 });
  });

  test("club settings page shows EBU Club Number field", async ({ page }) => {
    await page.goto("/settings/club");
    await expect(page.getByLabel("EBU Club Number")).toBeVisible({
      timeout: 10000,
    });
  });

  test("club settings page shows Save button", async ({ page }) => {
    await page.goto("/settings/club");
    await expect(
      page.getByRole("button", { name: "Save" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("club settings page shows Back button", async ({ page }) => {
    await page.goto("/settings/club");
    await expect(
      page.getByRole("button", { name: "Back" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("GET /api/system/club returns club data", async ({ request }) => {
    const response = await request.get("/api/system/club");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("club");
  });

  test("POST /api/system/club saves club info", async ({ request }) => {
    const response = await request.post("/api/system/club", {
      data: { name: "E2E Test Club", clubNumber: "99999" },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test("POST /api/system/club rejects missing fields", async ({ request }) => {
    const response = await request.post("/api/system/club", {
      data: { name: "Test Club" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("saved club info persists on GET", async ({ request }) => {
    // Save
    await request.post("/api/system/club", {
      data: { name: "Persistence Test Club", clubNumber: "12345" },
    });

    // Read back
    const response = await request.get("/api/system/club");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.club.name).toBe("Persistence Test Club");
    expect(body.club.clubNumber).toBe("12345");
  });
});
