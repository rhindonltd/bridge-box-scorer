import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import { unlockSettings } from "./fixtures/settings";

/**
 * Settings E2E Tests — WiFi
 *
 * The WiFi settings screen is capability-aware: on a device WITHOUT WiFi
 * management (no `nmcli`, e.g. dev machines / CI) `GET /api/system/network`
 * reports `available: false` and the UI shows a "WiFi settings can't be changed
 * on this device" page instead of the network picker. On a device WITH `nmcli`
 * it shows the picker (network selector, password, Test/Save). Scanning is an
 * explicit, disruptive action and never runs automatically.
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

  test("network API reports WiFi-management availability", async ({
    request,
  }) => {
    // Capability is read from the network endpoint; the scan is disruptive and
    // never runs on load.
    const res = await request.get("/api/system/network");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.result.wifi.available).toBe("boolean");
    expect(body.result.wifi.available).toBe(NMCLI);
  });

  test("scan API is admin-gated", async ({ request }) => {
    // Scanning is a disruptive device operation and requires an admin token.
    const res = await request.post("/api/system/wifi/scan");
    expect(res.status()).toBe(401);
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
