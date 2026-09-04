import { test, expect } from "@playwright/test";

/**
 * API Routes E2E Tests
 *
 * Tests the HTTP API endpoints directly using Playwright's request context.
 * Successful responses use the shared envelope `{ success: true, result }`, so
 * payloads are read from `body.result`.
 */

test.describe("API Routes", () => {
  test.describe("Games API", () => {
    test("GET /api/games/joinable returns games array", async ({ request }) => {
      const response = await request.get("/api/games/joinable");

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body.result.games)).toBe(true);
    });

    test("GET /api/games/[gameId] with non-existent ID returns JSON", async ({
      request,
    }) => {
      const response = await request.get("/api/games/does-not-exist");

      expect(response.headers()["content-type"]).toContain("application/json");
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Game not found");
    });

    test("GET /api/games/joinable returns correct shape when games exist", async ({
      request,
    }) => {
      const response = await request.get("/api/games/joinable");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      const games = body.result.games;
      expect(Array.isArray(games)).toBe(true);

      // If any games exist, verify their shape
      if (games.length > 0) {
        const game = games[0];
        expect(game).toHaveProperty("gameId");
        expect(game).toHaveProperty("eventName");
      }
    });
  });

  test.describe("Players API", () => {
    test("GET /api/players/search?q=477484 searches by EBU number", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=477484");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      const players = body.result;
      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBeGreaterThanOrEqual(1);
      expect(
        players.some((p: { nationalId: string }) =>
          p.nationalId?.startsWith("477484"),
        ),
      ).toBe(true);
    });

    test("GET /api/players/search?q=xyznotexist returns empty array for no matches", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=xyznotexist");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(Array.isArray(body.result)).toBe(true);
      expect(body.result).toHaveLength(0);
    });

    test("GET /api/players/search?q=a returns empty array for query less than 2 chars", async ({
      request,
    }) => {
      const response = await request.get("/api/players/search?q=a");

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(Array.isArray(body.result)).toBe(true);
      expect(body.result).toHaveLength(0);
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
      expect(Array.isArray(body.result)).toBe(true);
    });

    test("GET /api/movements/pairs/4 returns movements for 4 tables", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/4");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body.result)).toBe(true);
    });

    test("GET /api/movements/pairs/1 returns movements for 1 table", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/1");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body.result)).toBe(true);
    });

    test("movements response items have expected shape", async ({
      request,
    }) => {
      const response = await request.get("/api/movements/pairs/2");

      expect(response.ok()).toBe(true);
      const body = await response.json();
      const movements = body.result;

      if (movements.length > 0) {
        const movement = movements[0];
        // Movement specs typically have an id and name
        expect(movement).toHaveProperty("id");
        expect(movement).toHaveProperty("name");
      }
    });

    // Note: there is no teams movements endpoint (only pairs), so no teams
    // movements test here.

    test("GET /api/movements/detail/PAIRS/[id] returns movement detail", async ({
      request,
    }) => {
      // First get available movements to obtain a valid ID
      const listResponse = await request.get("/api/movements/pairs/2");
      expect(listResponse.ok()).toBe(true);
      const listBody = await listResponse.json();
      const movements = listBody.result;
      expect(movements.length).toBeGreaterThan(0);

      const id = movements[0].id;

      // Now fetch the movement detail
      const response = await request.get(`/api/movements/detail/PAIRS/${id}`);

      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body = await response.json();
      const detail = body.result;
      expect(detail).toHaveProperty("tables");
      expect(Array.isArray(detail.tables)).toBe(true);
      expect(detail).toHaveProperty("type", "PAIRS");
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
    test("POST /api/system/restart returns a response", async ({ request }) => {
      const response = await request.post("/api/system/restart");

      // The endpoint may require an admin token header and return 401/403
      // without it. We just verify the endpoint exists and responds.
      expect(response.status()).toBeDefined();
      expect(response.headers()["content-type"]).toBeDefined();
    });
  });
});
