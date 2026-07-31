import { test, expect } from "@playwright/test";

/**
 * Game API E2E Tests
 *
 * Tests the game-specific API endpoints (boards, status, movement, etc.)
 * Most of these require an existing game, so we test error handling for
 * non-existent games.
 */

test.describe("Game API Endpoints", () => {
  test("GET /api/games/nonexistent/boards returns 404", async ({
    request,
  }) => {
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

  test("GET /api/games/nonexistent/leaderboard returns 404", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent/leaderboard");
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

  test("POST /api/games/nonexistent/status returns 401 without token", async ({
    request,
  }) => {
    const response = await request.post("/api/games/nonexistent/status", {
      data: { status: "JOINABLE", directorToken: "invalid" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/games/nonexistent/boards/1/override returns 401 without valid token", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/games/nonexistent/boards/1/override",
      {
        data: {
          roundNumber: 1,
          tableNumber: 1,
          result: "3NTN=",
          directorToken: "invalid",
        },
      },
    );
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/games/nonexistent/delete returns 401 without valid token", async ({
    request,
  }) => {
    const response = await request.delete("/api/games/nonexistent/delete", {
      data: { directorToken: "invalid" },
    });
    expect(response.status()).toBe(401);
  });
});
