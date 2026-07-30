import { test, expect } from "@playwright/test";

/**
 * Director Authentication E2E Tests
 *
 * Tests the full authentication lifecycle:
 * - First-time password setup
 * - Login with correct/incorrect credentials
 * - Status endpoint
 * - Protected route access
 */

const TEST_PASSWORD = "e2e-test-password-123";

test.describe.serial("Director Authentication", () => {
  test("GET /api/director/status returns passwordSet flag", async ({
    request,
  }) => {
    const response = await request.get("/api/director/status");

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("passwordSet");
    expect(typeof body.passwordSet).toBe("boolean");
  });

  test("POST /api/director/set-password sets the director password", async ({
    request,
  }) => {
    const statusResponse = await request.get("/api/director/status");
    const { passwordSet } = await statusResponse.json();

    if (passwordSet) {
      // Password already set from a previous run — skip gracefully
      test.skip();
      return;
    }

    const response = await request.post("/api/director/set-password", {
      data: { password: TEST_PASSWORD },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test("POST /api/director/set-password rejects when already set", async ({
    request,
  }) => {
    const response = await request.post("/api/director/set-password", {
      data: { password: "another-password" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("already set");
  });

  test("POST /api/director/login rejects empty body", async ({ request }) => {
    const response = await request.post("/api/director/login", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/director/login rejects empty password string", async ({
    request,
  }) => {
    const response = await request.post("/api/director/login", {
      data: { password: "" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/director/login rejects wrong password", async ({
    request,
  }) => {
    const response = await request.post("/api/director/login", {
      data: { password: "incorrect-password" },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/director/login succeeds with correct password", async ({
    request,
  }) => {
    const response = await request.post("/api/director/login", {
      data: { password: TEST_PASSWORD },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Should set directorToken cookie
    const cookies = response.headers()["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies).toContain("directorToken");
  });

  test("GET /api/director/status shows passwordSet: true after setup", async ({
    request,
  }) => {
    const response = await request.get("/api/director/status");

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.passwordSet).toBe(true);
  });

  test("GET /api/director/token rejects without cookie", async ({
    request,
  }) => {
    const response = await request.get("/api/director/token");

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("/create is accessible without auth", async ({ page }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);
  });

  test("/manage is accessible without auth", async ({ page }) => {
    await page.goto("/manage");
    // /manage redirects to /manage/select-game
    await expect(page).toHaveURL(/\/manage/);
  });
});
