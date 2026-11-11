import { test, expect, type Browser, type Page } from "@playwright/test";
import { startEbuMock, type EbuMock } from "../fixtures/ebu-mock";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";
import { fetchAdminToken, unlockSettings } from "../fixtures/settings";
import { newParticipant } from "./support";

/**
 * EBU settings screen (Settings -> EBU), and that what is saved there is what
 * an EBU upload actually uses.
 *
 * The upload runs against the local EBU stand-in (see fixtures/ebu-mock.ts and
 * ebu-upload.journey.ts), which records the HTTP Basic credentials of every call,
 * so the last half of this file proves the saved number and password reach the
 * EBU: saved together, then the number changed alone (blank password keeps the
 * stored one), then the password changed alone.
 *
 * Tests run in order and share the device's EBU settings, so nothing here
 * assumes a particular starting state: the "not configured" views are produced
 * by intercepting the status read in the browser.
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

const basic = (number: string, password: string) =>
  `Basic ${Buffer.from(`${number}:${password}`).toString("base64")}`;

async function settingsPage(
  browser: Browser,
  request: import("@playwright/test").APIRequestContext,
): Promise<Page> {
  const page = await newParticipant(browser);
  await unlockSettings(page, request);
  return page;
}

/** Fill the form and press Save. A blank password is left untouched. */
async function save(page: Page, number: string, password: string) {
  await page.getByLabel("EBU Club Number").fill(number);
  if (password) await page.getByLabel("EBU Password").fill(password);
  await page.getByRole("button", { name: "Save", exact: true }).click();
}

test.describe.serial("EBU settings", () => {
  test("is reachable from the settings menu", async ({ browser, request }) => {
    const page = await settingsPage(browser, request);
    try {
      await page.goto("/settings");
      await page.getByRole("link", { name: "EBU", exact: true }).click();
      await expect(page).toHaveURL(/\/settings\/ebu$/);
      await expect(page.getByLabel("EBU Club Number")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByLabel("EBU Password")).toBeVisible();
    } finally {
      await page.context().close();
    }
  });

  test("a first-time setup needs both a number and a password", async ({
    browser,
    request,
  }) => {
    const page = await settingsPage(browser, request);
    // Present the screen as not-yet-configured whatever the device holds.
    await page.route("**/api/system/ebu", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              result: { configured: false, ebuNumber: null },
            }),
          })
        : route.abort(),
    );
    try {
      await page.goto("/settings/ebu");
      await expect(page.getByLabel("EBU Club Number")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByLabel("EBU Password")).toHaveAttribute(
        "placeholder",
        "Enter password",
      );
      await expect(page.getByText(/A password is saved/)).toHaveCount(0);

      // Nothing entered.
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("EBU number is required")).toBeVisible();

      // A number but no password: still refused (nothing is sent).
      await page.getByLabel("EBU Club Number").fill("123456");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Password is required")).toBeVisible();
    } finally {
      await page.context().close();
    }
  });

  test("saving stores the details; the password is never shown back", async ({
    browser,
    request,
  }) => {
    const page = await settingsPage(browser, request);
    try {
      await page.goto("/settings/ebu");
      await save(page, "  123456  ", "first-password");
      await expect(page.getByText("✅ EBU settings saved")).toBeVisible({
        timeout: 15000,
      });
      // Configured now: the password box empties and says one is kept.
      await expect(page.getByLabel("EBU Password")).toHaveValue("");
      await expect(page.getByText(/A password is saved/)).toBeVisible();

      // Reopening shows the number (trimmed) and a keep-it placeholder.
      await page.reload();
      await expect(page.getByLabel("EBU Club Number")).toHaveValue("123456", {
        timeout: 15000,
      });
      await expect(page.getByLabel("EBU Password")).toHaveAttribute(
        "placeholder",
        /leave blank to keep/,
      );

      // The server reports only that a password exists, never what it is.
      const status = await (await request.get("/api/system/ebu")).json();
      expect(status.result).toEqual({ configured: true, ebuNumber: "123456" });
      expect(JSON.stringify(status)).not.toContain("first-password");
    } finally {
      await page.context().close();
    }
  });

  test("changing the number alone keeps the saved password", async ({
    browser,
    request,
  }) => {
    const page = await settingsPage(browser, request);
    try {
      await page.goto("/settings/ebu");
      await save(page, "654321", "");
      await expect(page.getByText("✅ EBU settings saved")).toBeVisible({
        timeout: 15000,
      });
      const status = await (await request.get("/api/system/ebu")).json();
      expect(status.result).toEqual({ configured: true, ebuNumber: "654321" });
    } finally {
      await page.context().close();
    }
  });

  test("the screen is behind the admin key", async ({ browser }) => {
    const page = await newParticipant(browser);
    try {
      await page.goto("/settings/ebu");
      await expect(
        page.getByRole("heading", { name: "Admin Access" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel("EBU Club Number")).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  test.describe("what is saved is what an upload sends", () => {
    test.skip(
      !MOCK_TARGETED,
      "App server must run with EBU_API_BASE / EBU_PARSE_USEBIO_URL pointed at the local mock.",
    );
    let mock: EbuMock;
    test.beforeAll(async () => {
      mock = await startEbuMock();
    });
    test.afterAll(async () => {
      await mock.close();
    });

    test("number and password saved on the screen, then each changed in turn", async ({
      browser,
      request,
    }) => {
      test.setTimeout(150_000);
      mock.reset();
      // The EBU upload also needs the club info for the USEBIO file.
      const adminToken = await fetchAdminToken(request);
      expect(
        (
          await request.post("/api/system/club", {
            headers: { "x-admin-token": adminToken },
            data: { name: "E2E Bridge Club", clubNumber: "12345" },
          })
        ).ok(),
      ).toBe(true);

      const game = await seedGame({
        scoring: "MP",
        tables: 2,
        movement: "recommended",
        play: "all",
        eventName: `EBU Settings ${Date.now()}`,
      });
      const director = await openDirector(
        browser,
        game,
        `/game/${game.gameId}/manage/upload-ebu`,
      );
      const settings = await settingsPage(browser, request);

      /** Submit the game and return the credentials the EBU saw. */
      const submit = async () => {
        mock.reset();
        await director.getByRole("button", { name: "Submit to EBU" }).click();
        await expect(director.getByRole("status")).toContainText(
          "Submitted to the EBU",
          { timeout: 20000 },
        );
        const auths = new Set(mock.calls().map((c) => c.authorization));
        // Every call in the workflow used the same credentials.
        expect(auths.size).toBe(1);
        return [...auths][0];
      };
      /** Edit the EBU settings screen. */
      const edit = async (number: string, password: string) => {
        await settings.goto("/settings/ebu");
        await expect(settings.getByLabel("EBU Club Number")).toBeVisible({
          timeout: 15000,
        });
        await save(settings, number, password);
        await expect(settings.getByText("✅ EBU settings saved")).toBeVisible({
          timeout: 15000,
        });
      };

      try {
        // Both entered together.
        await edit("111111", "pw-one");
        expect(await submit()).toBe(basic("111111", "pw-one"));

        // Number changed, password left blank: the old password still goes.
        await edit("222222", "");
        expect(await submit()).toBe(basic("222222", "pw-one"));

        // Password changed, number re-entered unchanged.
        await edit("222222", "pw-two");
        expect(await submit()).toBe(basic("222222", "pw-two"));
      } finally {
        await closeDevices(director, settings);
      }
    });
  });
});
