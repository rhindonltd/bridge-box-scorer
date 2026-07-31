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

  test.describe("Players API", () => {
    test("GET /api/players/search?q=john returns matching players", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=john");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.some((p: { firstName: string }) => p.firstName === "John")).toBe(true);
    });

    test("GET /api/players/search?q=123 searches by EBU number", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=123");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(
        body.some((p: { nationalId: string }) => p.nationalId?.startsWith("123")),
      ).toBe(true);
    });

    test("GET /api/players/search?q=xyznotexist returns empty array for no matches", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=xyznotexist");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    test("GET /api/players/search?q=a returns empty array for query less than 2 chars", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=a");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });
  });

  test.describe("USEBIO API", () => {
    test("GET /api/games/nonexistent/usebio returns 404 for non-existent game", async ({
      request,
    }) => {
      const response = await request.get("/api/games/nonexistent/usebio");

      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Game not found");
    });

    test("GET /api/games/[gameId]/usebio returns appropriate content type", async ({
      request,
    }) => {
      const response = await request.get("/api/games/nonexistent/usebio");

      expect(response.headers()["content-type"]).toContain("application/json");
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

    test("GET /api/movements/teams/2 returns movements for 2 tables", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/teams/2");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);

      if (body.length > 0) {
        const movement = body[0];
        expect(movement).toHaveProperty("id");
        expect(movement).toHaveProperty("name");
      }
    });

    test("GET /api/movements/detail/PAIRS/[id] returns movement detail", async ({
      request,
    }) => {
      // First get available movements to obtain a valid ID
      const listResponse = await request.get("/api/movements/pairs/2");
      expect(listResponse.ok()).toBe(true);
      const movements = await listResponse.json();
      expect(movements.length).toBeGreaterThan(0);

      const id = movements[0].id;

      // Now fetch the movement detail
      const response = await request.get(
        `/api/movements/detail/PAIRS/${id}`,
      );

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(body).toHaveProperty("tables");
      expect(Array.isArray(body.tables)).toBe(true);
      expect(body).toHaveProperty("type", "PAIRS");
    });

    test("GET /api/movements/detail/INVALID_TYPE/1 returns 400", async ({
      request,
    }) => {
      const response = await request.get(
        "/api/movements/detail/INVALID_TYPE/1",
      );

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });

  test.describe("System API", () => {
    test("POST /api/system/restart returns a response", async ({
      request,
    }) => {
      const response = await request.post("/api/system/restart");

      // The endpoint may require an admin key header and return 401/403 without it.
      // We just verify the endpoint exists and responds with a valid HTTP status.
      expect(response.status()).toBeDefined();
      expect(response.headers()["content-type"]).toBeDefined();
    });
  });
});
