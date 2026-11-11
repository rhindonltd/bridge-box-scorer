import { test, expect } from "@playwright/test";
import { unlockSettings, fetchAdminToken } from "./fixtures/settings";

/**
 * Club Settings E2E Tests
 *
 * The club's name and EBU number are edited on the EBU settings screen (see
 * journeys/ebu-settings.journey.ts); there is no separate Club Information
 * screen. These tests cover the club API endpoint the exports read from: GET is
 * public, POST is gated by the device admin key.
 */

test.describe("Club Settings", () => {
  test("the EBU settings screen has the Club Name field", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/ebu");
    await expect(page.getByLabel("Club Name")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("EBU Club Number")).toBeVisible();
  });

  test("GET /api/system/club returns club data", async ({ request }) => {
    const response = await request.get("/api/system/club");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    // Responses use the success envelope: { success, result: { club } }.
    expect(body.result).toHaveProperty("club");
  });

  test("POST /api/system/club saves club info (admin-gated)", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);
    const response = await request.post("/api/system/club", {
      headers: { "x-admin-token": token },
      data: { name: "E2E Test Club", clubNumber: "99999" },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test("POST /api/system/club rejects missing fields", async ({ request }) => {
    const token = await fetchAdminToken(request);
    const response = await request.post("/api/system/club", {
      headers: { "x-admin-token": token },
      data: { name: "Test Club" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/system/club is rejected without an admin token", async ({
    request,
  }) => {
    const response = await request.post("/api/system/club", {
      data: { name: "Unauthorised Club", clubNumber: "00000" },
    });
    expect(response.status()).toBe(401);
  });

  test("saved club info persists on GET", async ({ request }) => {
    const token = await fetchAdminToken(request);
    // Save (admin-gated)
    await request.post("/api/system/club", {
      headers: { "x-admin-token": token },
      data: { name: "Persistence Test Club", clubNumber: "12345" },
    });

    // Read back (GET is public)
    const response = await request.get("/api/system/club");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.result.club.name).toBe("Persistence Test Club");
    expect(body.result.club.clubNumber).toBe("12345");
  });
});
