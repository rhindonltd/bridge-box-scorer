import { test, expect, Browser } from "@playwright/test";

import { createGame } from "./fixtures/game-create";
import { setTableCount, pickFirstMovement, startGame } from "./fixtures/game-setup";
import { seatTwoTableField } from "./fixtures/join";
import { deleteGame } from "./fixtures/delete-game";
import { fetchAdminToken } from "./fixtures/settings";

/**
 * HTTP API contract tests (browser-free assertions).
 *
 * A single started two-table game is set up once through the UI fixtures (so
 * boards/schedule/participants/sections/movement/results have real data), then
 * the read endpoints are asserted directly via Playwright's request context.
 * System/device endpoints are asserted for their status/shape and auth.
 *
 * WiFi/network endpoints shell out to nmcli, which is absent on dev/CI hosts;
 * those degrade gracefully (200 with `available:false`), which is what we
 * assert here. The real nmcli-backed success paths need an appliance host.
 */

let gameId = "";
let directorPage: import("@playwright/test").Page;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  directorPage = await (
    await browser.newContext(test.info().project.use)
  ).newPage();
  const created = await createGame(directorPage, {
    eventName: `API Contract ${Date.now()}`,
    recordOpeningLead: false,
  });
  gameId = created.gameId;
  await setTableCount(directorPage, 2);
  await pickFirstMovement(directorPage);
  await seatTwoTableField(directorPage, gameId);
  await startGame(directorPage, gameId);
});

test.afterAll(async () => {
  await deleteGame(directorPage, gameId);
  await directorPage.context().close();
});

test.describe("API contract — games (existing game)", () => {
  test("GET /api/games/[id] returns the game", async ({ request }) => {
    const res = await request.get(`/api/games/${gameId}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.result.game.gameId).toBe(gameId);
  });

  test("GET /api/games/all returns an array including this game", async ({
    request,
  }) => {
    const res = await request.get("/api/games/all");
    expect(res.ok()).toBe(true);
    const games = (await res.json()).result.games;
    expect(Array.isArray(games)).toBe(true);
    expect(games.some((g: { gameId: string }) => g.gameId === gameId)).toBe(
      true,
    );
  });

  test("GET /api/games/[id]/participants returns seated pairs", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/participants`);
    expect(res.ok()).toBe(true);
    const pairs = (await res.json()).result.pairs;
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBeGreaterThan(0);
  });

  test("GET /api/games/[id]/movement?section=A returns a movement", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/movement?section=A`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.result).toHaveProperty("movement");
  });

  test("GET /api/games/[id]/sections returns the section list", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/sections`);
    expect(res.ok()).toBe(true);
    const sections = (await res.json()).result.sections;
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.some((s: { section: string }) => s.section === "A")).toBe(
      true,
    );
  });

  test("GET /api/games/[id]/boards returns distinct board numbers", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/boards`);
    expect(res.ok()).toBe(true);
    const boards = (await res.json()).result.boards;
    expect(Array.isArray(boards)).toBe(true);
    expect(boards.length).toBeGreaterThan(0);
  });

  test("GET /api/games/[id]/boards/[n] returns instances", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/boards/1`);
    expect(res.ok()).toBe(true);
    const instances = (await res.json()).result.instances;
    expect(Array.isArray(instances)).toBe(true);
  });

  test("GET /api/games/[id]/boards/[non-int] returns 400", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/boards/abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("GET /api/games/[id]/schedule/[seat] returns a schedule; unknown seat 404", async ({
    request,
  }) => {
    const ok = await request.get(`/api/games/${gameId}/schedule/A1NS`);
    expect(ok.ok()).toBe(true);
    const sched = (await ok.json()).result;
    expect(Array.isArray(sched.rounds)).toBe(true);

    const unknown = await request.get(`/api/games/${gameId}/schedule/Z9NS`);
    expect(unknown.status()).toBe(404);
  });

  test("GET /api/games/[id]/results-summary responds 200", async ({
    request,
  }) => {
    const res = await request.get(`/api/games/${gameId}/results-summary`);
    expect(res.ok()).toBe(true);
  });

  test("GET /api/games/[id]/start-check responds 200", async ({ request }) => {
    const res = await request.get(`/api/games/${gameId}/start-check`);
    expect(res.ok()).toBe(true);
    expect((await res.json()).result).toHaveProperty("canStart");
  });
});

test.describe("API contract — movements", () => {
  test("GET /api/movements/pairs/0 returns 400", async ({ request }) => {
    const res = await request.get("/api/movements/pairs/0");
    expect(res.status()).toBe(400);
  });

  test("GET /api/movements/pairs/abc returns 400", async ({ request }) => {
    const res = await request.get("/api/movements/pairs/abc");
    expect(res.status()).toBe(400);
  });

  test("GET /api/movements/detail/PAIRS/{unknown} returns 404", async ({
    request,
  }) => {
    const res = await request.get("/api/movements/detail/PAIRS/9999999");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

test.describe("API contract — players", () => {
  test("GET /api/players/search?q={non-digit} returns an empty array", async ({
    request,
  }) => {
    const res = await request.get("/api/players/search?q=zzzz");
    expect(res.ok()).toBe(true);
    expect((await res.json()).result).toEqual([]);
  });
});

test.describe("API contract — system / device", () => {
  test("POST /api/system/wifi/scan returns { available, ssids }", async ({
    request,
  }) => {
    const res = await request.post("/api/system/wifi/scan");
    expect(res.ok()).toBe(true);
    const result = (await res.json()).result;
    expect(typeof result.available).toBe("boolean");
    expect(Array.isArray(result.ssids)).toBe(true);
  });

  test("GET /api/system/network responds 200 with a wifi availability shape", async ({
    request,
  }) => {
    const res = await request.get("/api/system/network");
    expect(res.ok()).toBe(true);
    const wifi = (await res.json()).result.wifi;
    expect(typeof wifi.available).toBe("boolean");
    expect(wifi).toHaveProperty("connected");
  });

  test("POST /api/system/wifi requires an admin token and validates the body", async ({
    request,
  }) => {
    // No token -> 401.
    const noToken = await request.post("/api/system/wifi", {
      data: { ssid: "X", password: "y" },
    });
    expect(noToken.status()).toBe(401);

    // With token but invalid body -> 400 (only reachable where WiFi mgmt is
    // available; on a no-nmcli host the route returns 200 success:false first).
    const token = await fetchAdminToken(request);
    const badBody = await request.post("/api/system/wifi", {
      headers: { "x-admin-token": token },
      data: { ssid: 123 },
    });
    expect([200, 400]).toContain(badBody.status());
  });

  test("POST /api/system/wifi/test returns success:false when WiFi mgmt is unavailable", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);
    const res = await request.post("/api/system/wifi/test", {
      headers: { "x-admin-token": token },
      data: { ssid: "SomeNet", password: "secret" },
    });
    // On a no-nmcli host this is a 200 test-outcome (success:false). On an
    // appliance host a bad password is also success:false. Either way, not a
    // connection success in this environment.
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(false);
  });

  test("admin-only device routes reject calls without a token", async ({
    request,
  }) => {
    for (const path of [
      "/api/system/reset-wifi",
      "/api/system/reboot",
      "/api/system/restart",
    ]) {
      const res = await request.post(path);
      expect(res.status(), `${path} without token`).toBe(401);
    }
  });

  test("admin-key/verify: right key -> token, wrong -> 401, missing -> 400", async ({
    request,
  }) => {
    // The fixture derives + verifies the real key (200 + token).
    const token = await fetchAdminToken(request);
    expect(token).toBeTruthy();

    const wrong = await request.post("/api/system/admin-key/verify", {
      data: { key: "definitely-not-the-key" },
    });
    expect(wrong.status()).toBe(401);

    const missing = await request.post("/api/system/admin-key/verify", {
      data: {},
    });
    expect(missing.status()).toBe(400);
  });

  test("admin-key update: <4 chars -> 400, no token -> 401", async ({
    request,
  }) => {
    const token = await fetchAdminToken(request);

    const short = await request.post("/api/system/admin-key", {
      headers: { "x-admin-token": token },
      data: { key: "abc" },
    });
    expect(short.status()).toBe(400);

    const noToken = await request.post("/api/system/admin-key", {
      data: { key: "a-valid-length-key" },
    });
    expect(noToken.status()).toBe(401);
  });
});
