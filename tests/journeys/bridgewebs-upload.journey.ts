import { test, expect, type APIRequestContext } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmEntireGame } from "../fixtures/complete-game";
import { fetchAdminToken } from "../fixtures/settings";
import { startBridgewebsMock, type BridgewebsMock } from "../fixtures/bridgewebs-mock";
import { setUpStartedTwoTableGame, expectInlineError } from "./support";

/**
 * BridgeWebs upload journey.
 *
 * The director can push a finished game's results (USEBIO) + hand records (PBN)
 * to the club's BridgeWebs site. The upload is a SERVER-SIDE POST to the
 * BridgeWebs API, so we can't intercept it in the browser. Instead the app
 * server is started with `BRIDGEWEBS_API_BASE` pointed at a local mock server
 * (playwright.config.ts sets this by default and passes it to the app server;
 * this journey starts the matching mock — see fixtures/bridgewebs-mock.ts).
 *
 * As a safety net these tests only run when the app is pointed at a LOOPBACK
 * host, so a run against a real/remote BridgeWebs (e.g. an operator-supplied
 * sandbox) skips rather than uploading to it.
 */

/** True when BRIDGEWEBS_API_BASE points at a loopback host (our mock). */
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

const MOCK_TARGETED = pointedAtLoopbackMock();

/** BridgeWebs is a device setting; seed/clear it via the admin API. */
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

async function setClubInfo(
  request: APIRequestContext,
  name: string,
  clubNumber: string,
): Promise<void> {
  const adminToken = await fetchAdminToken(request);
  const res = await request.post("/api/system/club", {
    headers: { "x-admin-token": adminToken },
    data: { name, clubNumber },
  });
  expect(res.ok()).toBe(true);
}

test.describe("BridgeWebs upload", () => {
  test.skip(
    !MOCK_TARGETED,
    "App server must run with BRIDGEWEBS_API_BASE pointed at the local mock (see the journey docstring).",
  );

  let mock: BridgewebsMock;

  test.beforeAll(async () => {
    mock = await startBridgewebsMock();
  });

  test.afterAll(async () => {
    await mock.close();
  });

  test("a configured game uploads results and shows the BridgeWebs reply", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    mock.reset();
    mock.setReply("success");

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `BW Upload ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      // Prerequisites: club info (for the USEBIO file) + BridgeWebs credentials
      // (so the upload is enabled and routes to our mock), and every result in
      // (the manage menu gates the upload on completion).
      await setClubInfo(request, "E2E Bridge Club", "12345");
      await setBridgewebsCredentials(request, "e2eclub", "secret");
      await confirmEntireGame(request, gameId);

      await directorPage.goto(`/game/${gameId}/manage/upload-bridgewebs`);

      await directorPage
        .getByRole("button", { name: "Upload to BridgeWebs" })
        .click();

      // The page shows the parsed BridgeWebs reply message on success.
      await expect(directorPage.getByRole("status")).toContainText(
        "Upload Successful",
        { timeout: 15000 },
      );

      // The app POSTed to our mock with the expected upload payload.
      const req = mock.lastRequest();
      expect(req, "the app should have called the BridgeWebs mock").not.toBeNull();
      expect(req!.url).toContain("club=e2eclub");
      expect(req!.fields.type).toBe("upload");
      expect(req!.fields.club).toBe("e2eclub");
      expect(req!.fields.password).toBe("secret");
      expect(req!.fields.filename).toMatch(/\.xml$/);
      expect(req!.fields.dealname).toMatch(/\.pbn$/);
      // The results file is the USEBIO XML.
      expect(req!.fields.data).toContain("<");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await Promise.all(
        Object.values(seats).map((p) => p.context().close()),
      );
    }
  });

  test("a BridgeWebs-reported failure is surfaced inline", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    mock.reset();
    mock.setReply("failure");

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `BW Upload Fail ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      await setClubInfo(request, "E2E Bridge Club", "12345");
      await setBridgewebsCredentials(request, "e2eclub", "secret");
      await confirmEntireGame(request, gameId);

      await directorPage.goto(`/game/${gameId}/manage/upload-bridgewebs`);
      await directorPage
        .getByRole("button", { name: "Upload to BridgeWebs" })
        .click();

      // A non-"Successful" reply renders as an inline error (not a status).
      await expectInlineError(directorPage, /Upload failed/i);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await Promise.all(
        Object.values(seats).map((p) => p.context().close()),
      );
    }
  });

  // The not-configured state (alert + disabled Upload button) is a shared
  // device-level singleton with no API to clear it (the save route rejects a
  // blank club code), so it cannot be forced deterministically here. It is
  // already unit-covered in UploadBridgewebsPage.test.tsx ("disables upload and
  // points to Settings when not configured"), so it is intentionally not
  // re-driven as an E2E.
});
