import { test, expect } from "@playwright/test";

/**
 * Game API E2E Tests
 *
 * Tests the game-specific API endpoints (boards, movement, schedule, etc.)
 * Most require an existing game, so we test error handling for non-existent
 * games.
 *
 * Note: the leaderboard and board-result override are now socket-only
 * (leaderboard:requestState / traveller:overrideResult); their HTTP routes were
 * removed, so they are not asserted here.
 */

test.describe("Game API Endpoints", () => {
  test("GET /api/games/nonexistent/boards returns 404", async ({ request }) => {
    const response = await request.get("/api/games/nonexistent/boards");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Game not found");
  });

  test("GET /api/games/nonexistent/boards/1 returns 404", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent/boards/1");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("GET /api/games/nonexistent/movement returns 404", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent/movement");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("GET /api/games/nonexistent/schedule/1NS returns 404", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent/schedule/1NS");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
