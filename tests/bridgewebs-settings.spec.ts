import { test, expect } from "@playwright/test";
import { unlockSettings, fetchAdminToken } from "./fixtures/settings";

/**
 * BridgeWebs Settings E2E Tests.
 *
 * The BridgeWebs credentials screen (gated by the device admin key; unlocked
 * via `unlockSettings`) lets an admin store the club's BridgeWebs code +
 * password, which enables the create-page event picker and the results upload.
 * Writing is admin-gated; the public status read never returns the password.
 *
 * These tests do not touch the real BridgeWebs API — saving credentials is a
 * local DB write, and the status read is local too.
 */

test.describe("BridgeWebs Settings", () => {
  test("the settings menu links to the BridgeWebs screen", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    const link = page.getByRole("link", { name: "BridgeWebs" });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(/\/settings\/bridgewebs/);
  });

  test("saving credentials shows success and the screen then reflects the configured state", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/bridgewebs");

    // Fill the club code + password and save.
    await page.getByLabel("BridgeWebs Club Code").fill("e2esettingsclub");
    await page.getByLabel("BridgeWebs Password").fill("s3cret");
    await page.getByRole("button", { name: "Save" }).click();

    // A "✅"-prefixed message renders as success.
    await expect(page.getByText(/BridgeWebs settings saved/i)).toBeVisible({
      timeout: 10000,
    });

    // Reload: now configured — the club code is shown and the password field
    // advertises the "leave blank to keep" rule.
    await page.goto("/settings/bridgewebs");
    await expect(page.getByLabel("BridgeWebs Club Code")).toHaveValue(
      "e2esettingsclub",
      { timeout: 10000 },
    );
    await expect(page.getByText(/leave blank to keep/i)).toBeVisible();
  });

  test("GET /api/system/bridgewebs returns the status shape without the password", async ({
    request,
  }) => {
    // Ensure configured so the shape is meaningful.
    const token = await fetchAdminToken(request);
    await request.post("/api/system/bridgewebs", {
      headers: { "x-admin-token": token },
      data: { club: "shapeclub", password: "shapepass" },
    });

    const res = await request.get("/api/system/bridgewebs");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // Success envelope: { success, result: { configured, club } }.
    expect(body.result).toHaveProperty("configured", true);
    expect(body.result).toHaveProperty("club", "shapeclub");
    // The password must never be exposed on the public status read.
    expect(JSON.stringify(body.result)).not.toContain("shapepass");
    expect(body.result).not.toHaveProperty("password");
  });

  test("POST /api/system/bridgewebs saves credentials (admin-gated)", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);
    const res = await request.post("/api/system/bridgewebs", {
      headers: { "x-admin-token": token },
      data: { club: "apiclub", password: "apipass" },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("POST /api/system/bridgewebs is rejected without an admin token", async ({
    request,
  }) => {
    const res = await request.post("/api/system/bridgewebs", {
      data: { club: "unauth", password: "nope" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/system/bridgewebs rejects a blank club code", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);
    const res = await request.post("/api/system/bridgewebs", {
      headers: { "x-admin-token": token },
      data: { club: "", password: "x" },
    });
    expect(res.status()).toBe(400);
  });

  test("a blank password keeps the stored one (club-only update)", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);

    // Configure a full credential set.
    await request.post("/api/system/bridgewebs", {
      headers: { "x-admin-token": token },
      data: { club: "keepclub", password: "keptpass" },
    });

    // Re-save with a blank password and a new club code: still configured
    // (the stored password is kept), and the club code is updated.
    const res = await request.post("/api/system/bridgewebs", {
      headers: { "x-admin-token": token },
      data: { club: "keepclub2", password: "" },
    });
    expect(res.ok()).toBe(true);

    const status = await request.get("/api/system/bridgewebs");
    const body = await status.json();
    expect(body.result.configured).toBe(true);
    expect(body.result.club).toBe("keepclub2");
  });
});
