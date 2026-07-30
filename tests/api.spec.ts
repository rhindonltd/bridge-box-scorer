import { test, expect } from "@playwright/test";

/**
 * API Routes E2E Tests
 *
 * Tests the HTTP API endpoints directly using Playwright's request context.
 * Covers director, games, and movements endpoints.
 */

test.describe("API Routes", () => {
  test.describe("Director API", () => {
    test("GET /api/director/status returns JSON with passwordSet", async ({
      request,
    }) => {
      const response = await request.get("/api/director/status");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(body).toHaveProperty("passwordSet");
      expect(typeof body.passwordSet).toBe("boolean");
    });

    test("POST /api/director/login with invalid JSON returns 400", async ({
      request,
    }) => {
      const response = await request.post("/api/director/login", {
        headers: { "content-type": "application/json" },
        data: "not valid json{{{",
      });

      // Should return 400 for invalid JSON
      expect(response.status()).toBe(400);
    });

    test("POST /api/director/login with missing password returns 400", async ({
      request,
    }) => {
      const response = await request.post("/api/director/login", {
        data: { username: "admin" },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test("POST /api/director/login validates password is non-empty string", async ({
      request,
    }) => {
      const response = await request.post("/api/director/login", {
        data: { password: "" },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test("GET /api/director/token without cookie returns 401", async ({
      request,
    }) => {
      const response = await request.get("/api/director/token");

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });

  test.describe("Games API", () => {
    test("GET /api/games/joinable returns array", async ({ request }) => {
      const response = await request.get("/api/games/joinable");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("GET /api/games/[gameId] with non-existent ID returns JSON", async ({
      request,
    }) => {
      const response = await request.get("/api/games/does-not-exist");

      expect(response.headers()["content-type"]).toContain("application/json");
      // May return null or an error, but should be valid JSON
      const body = await response.json();
      expect(body !== undefined).toBe(true);
    });

    test("GET /api/games/joinable returns correct shape when games exist", async ({
      request,
    }) => {
      const response = await request.get("/api/games/joinable");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);

      // If any games exist, verify their shape
      if (body.length > 0) {
        const game = body[0];
        expect(game).toHaveProperty("gameId");
        expect(game).toHaveProperty("eventName");
        expect(game).toHaveProperty("status");
      }
    });
  });

  test.describe("Movements API", () => {
    test("GET /api/movements/pairs/2 returns movements for 2 tables", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/2");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      // Should return an array of movement options
      expect(Array.isArray(body)).toBe(true);
    });

    test("GET /api/movements/pairs/4 returns movements for 4 tables", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/4");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("GET /api/movements/individual/3 returns movements for 3 tables", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/individual/3");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("GET /api/movements/pairs/1 returns movements for 1 table", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/1");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("GET /api/movements/individual/1 returns movements for 1 table", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/individual/1");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("movements response items have expected shape", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/2");

      expect(response.ok()).toBe(true);
      const body = await response.json();

      if (body.length > 0) {
        const movement = body[0];
        // Movement specs typically have an id and name
        expect(movement).toHaveProperty("id");
        expect(movement).toHaveProperty("name");
      }
    });
  });
});
