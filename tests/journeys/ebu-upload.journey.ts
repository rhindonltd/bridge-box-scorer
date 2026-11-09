import { test, expect, type APIRequestContext } from "@playwright/test";
import { fetchAdminToken } from "../fixtures/settings";
import { startEbuMock, type EbuMock } from "../fixtures/ebu-mock";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";

/**
 * EBU results submission journey.
 *
 * Submitting to the EBU is a server-side, four-call workflow (parse the USEBIO
 * file, check the session date, check the players, submit). The app server is
 * started with `EBU_API_BASE` / `EBU_PARSE_USEBIO_URL` pointing at a local
 * stand-in (playwright.config.ts sets both; see fixtures/ebu-mock.ts), so these
 * tests never reach the real EBU. As a safety net they only run when both
 * point at a LOOPBACK host.
 *
 * Tests run in order: the first checks the unconfigured state, before any EBU
 * credentials have been saved to the (per-run) device settings.
 */
function loopback(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}
const MOCK_TARGETED =
  loopback(process.env.EBU_API_BASE) &&
  loopback(process.env.EBU_PARSE_USEBIO_URL);

async function saveEbuCredentials(
  request: APIRequestContext,
  ebuNumber: string,
  password: string,
) {
  const adminToken = await fetchAdminToken(request);
  const res = await request.post("/api/system/ebu", {
    headers: { "x-admin-token": adminToken },
    data: { ebuNumber, password },
  });
  expect(res.ok()).toBe(true);
}

async function saveClub(request: APIRequestContext) {
  const adminToken = await fetchAdminToken(request);
  const res = await request.post("/api/system/club", {
    headers: { "x-admin-token": adminToken },
    data: { name: "E2E Bridge Club", clubNumber: "12345" },
  });
  expect(res.ok()).toBe(true);
}

/** A finished 2-table game, opened on its EBU submission page. */
async function finishedGameOnEbuPage(
  browser: import("@playwright/test").Browser,
) {
  const game = await seedGame({
    scoring: "MP",
    tables: 2,
    movement: "recommended",
    play: "all",
    eventName: `EBU Upload ${Date.now()}`,
  });
  const director = await openDirector(
    browser,
    game,
    `/game/${game.gameId}/manage/upload-ebu`,
  );
  return { game, director };
}

test.describe.serial("EBU results submission", () => {
  test.skip(
    !MOCK_TARGETED,
    "App server must run with EBU_API_BASE / EBU_PARSE_USEBIO_URL pointed at the local mock (see the journey docstring).",
  );

  let mock: EbuMock;
  test.beforeAll(async () => {
    mock = await startEbuMock();
  });
  test.afterAll(async () => {
    await mock.close();
  });
  test.beforeEach(() => mock.reset());

  test("without EBU credentials the page says so and cannot submit", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const { director } = await finishedGameOnEbuPage(browser);
    try {
      await expect(director.getByText(/EBU is not configured/)).toBeVisible({
        timeout: 15000,
      });
      await expect(
        director.getByRole("button", { name: "Submit to EBU" }),
      ).toBeDisabled();
      expect(mock.calls()).toHaveLength(0);
    } finally {
      await closeDevices(director);
    }
  });

  test("a finished game is parsed, its players checked, and submitted", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    await saveClub(request);
    await saveEbuCredentials(request, "123456", "s3cret");
    const { director } = await finishedGameOnEbuPage(browser);
    try {
      await director.getByRole("button", { name: "Submit to EBU" }).click();
      await expect(director.getByRole("status")).toContainText(
        "Submitted to the EBU (session E2E-4242)",
        { timeout: 20000 },
      );

      // The four calls ran in the documented order...
      const calls = mock.calls();
      expect(calls.map((c) => c.step)).toEqual([
        "parse",
        "session-date",
        "check-players",
        "submission",
      ]);
      // ...each as the configured club account (HTTP Basic)...
      const basic = `Basic ${Buffer.from("123456:s3cret").toString("base64")}`;
      for (const c of calls) expect(c.authorization).toBe(basic);
      // ...the USEBIO file went to the parser as `myfile`...
      const parse = calls[0];
      expect(parse.body).toContain('name="myfile"');
      expect(parse.body).toMatch(/filename="EBU_Upload_[^"]*\.xml"/);
      expect(parse.body).toContain("<USEBIO");
      // ...the players the parser found were checked...
      expect(calls[2].data).toEqual([
        { ebu: "477484", surname: "Collier" },
        { ebu: "404476", surname: "Collier" },
      ]);
      // ...and the submitted session carries the returned check keys.
      const submitted = JSON.stringify(calls[3].data);
      expect(submitted).toContain('"check":"chk-477484"');
      expect(submitted).toContain('"check":"chk-404476"');
    } finally {
      await closeDevices(director);
    }
  });

  test("a submission the EBU rejects shows the EBU's reason", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    mock.setMode("rejected");
    const { director } = await finishedGameOnEbuPage(browser);
    try {
      await director.getByRole("button", { name: "Submit to EBU" }).click();
      await expect(
        director.getByRole("alert").filter({ hasText: "rejected" }),
      ).toContainText("Session rejected: duplicate event", { timeout: 20000 });
      await expect(director.getByRole("status")).toHaveCount(0);
    } finally {
      await closeDevices(director);
    }
  });

  test("duplicate-date and surname-mismatch notes are shown but do not block", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    mock.setDuplicates(2);
    mock.setPlayerMismatch(true);
    const { director } = await finishedGameOnEbuPage(browser);
    try {
      await director.getByRole("button", { name: "Submit to EBU" }).click();
      await expect(director.getByRole("status")).toContainText(
        "session E2E-4242",
        {
          timeout: 20000,
        },
      );
      await expect(
        director.getByText(
          /already has 2 session\(s\) submitted for this date/,
        ),
      ).toBeVisible();
      await expect(
        director.getByText(/1 player\(s\) have a surname that does not match/),
      ).toBeVisible();
    } finally {
      await closeDevices(director);
    }
  });

  test("bad credentials surface as a connection problem, not a success", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    mock.setMode("unauthorized");
    const { director } = await finishedGameOnEbuPage(browser);
    try {
      await director.getByRole("button", { name: "Submit to EBU" }).click();
      await expect(director.getByText(/Could not reach the EBU/)).toBeVisible({
        timeout: 20000,
      });
      await expect(director.getByRole("status")).toHaveCount(0);
    } finally {
      await closeDevices(director);
    }
  });
});
