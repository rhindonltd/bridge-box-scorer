import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import { unlockSettings } from "./fixtures/settings";

/**
 * Settings E2E Tests — WiFi
 *
 * The WiFi settings screen is capability-aware: on a device WITHOUT WiFi
 * management (no `nmcli`, e.g. dev machines / CI) the scan endpoint reports
 * `available: false` and the UI shows a "WiFi settings can't be changed on this
 * device" page instead of the network picker. On a device WITH `nmcli` it shows
 * the picker (network selector, password, Test/Save).
 *
 * These tests assert whichever behaviour matches the host, so they pass on both
 * kinds of machine. The settings section is gated by the device admin key;
 * `unlockSettings` seeds a valid admin session token before navigating.
 */

/** Whether this host has nmcli (i.e. can manage WiFi). */
function hasNmcli(): boolean {
  try {
    execFileSync("command", ["-v", "nmcli"], { shell: "/bin/sh" });
    return true;
  } catch {
    return false;
  }
}

const NMCLI = hasNmcli();

test.describe("WiFi settings", () => {
  test("shows the unavailable page when the device can't manage WiFi", async ({
    page,
    request,
  }) => {
    test.skip(NMCLI, "device has nmcli; WiFi picker is shown instead");

    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    await expect(page.getByTestId("wifi-unavailable")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("WiFi settings can't be changed on this device"),
    ).toBeVisible();
    // The network picker controls are not rendered on such a device.
    await expect(
      page.getByRole("button", { name: "Test Connection" }),
    ).toHaveCount(0);
  });

  test("scan API reports availability", async ({ request }) => {
    const res = await request.post("/api/system/wifi/scan");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.result.available).toBe("boolean");
    expect(body.result.available).toBe(NMCLI);
    expect(Array.isArray(body.result.ssids)).toBe(true);
  });

  test.describe("with WiFi management available", () => {
    test.skip(!NMCLI, "device has no nmcli; WiFi picker is not shown");

    test("shows the network picker and gated Save", async ({
      page,
      request,
    }) => {
      await unlockSettings(page, request);
      await page.goto("/settings/wifi");

      await expect(page.getByText("WiFi Settings")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText("Network")).toBeVisible();
      await expect(page.getByPlaceholder("Enter WiFi password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Test Connection" }),
      ).toBeVisible();

      const saveButton = page.getByRole("button", { name: "Save & Apply" });
      await expect(saveButton).toBeVisible();
      // Save stays disabled until a connection test of the selected network
      // passes.
      await expect(saveButton).toBeDisabled();
    });
  });
});
