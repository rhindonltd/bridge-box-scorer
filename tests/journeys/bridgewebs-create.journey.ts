import { test, expect, type APIRequestContext } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { fetchAdminToken } from "../fixtures/settings";
import { startBridgewebsMock, type BridgewebsMock } from "../fixtures/bridgewebs-mock";
import { newParticipant } from "./support";

/**
 * Create-page BridgeWebs event picker journey (end to end).
 *
 * When BridgeWebs credentials are configured, the create page fetches the day's
 * calendar events (`GET /api/games/bridgewebs/events` → the server posts to the
 * BridgeWebs API) and offers a picker; choosing an event prefills the event
 * name and stores the event id on the created game.
 *
 * That events fetch is a SERVER-SIDE call, so — like the upload journey — the
 * app server is pointed at the local mock (playwright.config.ts) and this
 * journey serves the events from that mock. Guarded to a loopback host so it
 * never reaches the real BridgeWebs.
 */

function pointedAtLoopbackMock(): boolean {
  const base = process.env.BRIDGEWEBS_API_BASE;
  if (!base) return false;
  try {
    const host = new URL(base).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

async function setBridgewebsCredentials(
  request: APIRequestContext,
  club: string,
  password: string,
): Promise<void> {
  const adminToken = await fetchAdminToken(request);
  const res = await request.post("/api/system/bridgewebs", {
    headers: { "x-admin-token": adminToken },
    data: { club, password },
  });
  expect(res.ok()).toBe(true);
}

test.describe("Create-page BridgeWebs event picker", () => {
  test.skip(
    !pointedAtLoopbackMock(),
    "App server must run pointed at the local BridgeWebs mock (see playwright.config.ts).",
  );

  let mock: BridgewebsMock;

  test.beforeAll(async () => {
    mock = await startBridgewebsMock();
  });

  test.afterAll(async () => {
    await mock.close();
  });

  test("selecting a BridgeWebs event prefills the name and persists on the game", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    mock.reset();
    mock.setEvents([
      { id: "7", title: "Monday Duplicate" },
      { id: "8", title: "Afternoon Teams" },
    ]);
    await setBridgewebsCredentials(request, "e2ecreateclub", "secret");

    const page = await newParticipant(browser);
    let gameId: string | null = null;

    try {
      await page.goto("/create");
      // Wait for the on-mount events fetch to settle so the picker renders.
      await page.waitForLoadState("networkidle");

      // The picker is present and lists the mock's events.
      const picker = page.getByLabel("BridgeWebs Event");
      await expect(picker).toBeVisible({ timeout: 15000 });

      await page.getByLabel("Director Name").fill("E2E Director");

      // Choose an event by its visible label; the name prefills from it.
      await picker.selectOption({ label: "Afternoon Teams" });
      await expect(page.getByLabel("Event Name")).toHaveValue(
        "Afternoon Teams",
        { timeout: 10000 },
      );

      await page.getByRole("button", { name: "Create Game", exact: true }).click();
      await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });
      gameId = /\/game\/([^/]+)\/create/.exec(page.url())?.[1] ?? null;
      expect(gameId).toBeTruthy();

      // The chosen event id is persisted on the created game.
      const res = await request.get(`/api/games/${gameId}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.result.game.bridgewebsEventId).toBe("8");
      expect(body.result.game.eventName).toBe("Afternoon Teams");
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });
});
