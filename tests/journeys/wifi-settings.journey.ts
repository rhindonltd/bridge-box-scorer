import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";

import { unlockSettings } from "../fixtures/settings";
import { newParticipant } from "./support";

/**
 * WiFi settings journey — capability-aware.
 *
 * The WiFi screen adapts to whether the device can manage WiFi (has `nmcli`).
 * On a device WITHOUT it (dev machines / CI) the scan endpoint reports
 * `available: false` and the UI shows a "WiFi settings can't be changed on this
 * device" page instead of the network picker. On a device WITH `nmcli` it shows
 * the picker with a Save gated on a successful connection test.
 *
 * These assertions match whichever the host actually is, so the journey passes
 * on both. WiFi settings are behind the admin-key gate; `unlockSettings` seeds
 * a valid admin token first.
 */

function hasNmcli(): boolean {
  try {
    execFileSync("command", ["-v", "nmcli"], { shell: "/bin/sh" });
    return true;
  } catch {
    return false;
  }
}

const NMCLI = hasNmcli();

test.describe("WiFi settings screen (capability-aware)", () => {
  test("scan API reports availability matching the host", async ({
    request,
  }) => {
    const res = await request.post("/api/system/wifi/scan");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.available).toBe(NMCLI);
    expect(Array.isArray(body.result.ssids)).toBe(true);
  });

  test("shows the unavailable page on a device without WiFi management", async ({
    browser,
    request,
  }) => {
    test.skip(NMCLI, "device has nmcli; the network picker is shown instead");

    const page = await newParticipant(browser);
    try {
      await unlockSettings(page, request);
      await page.goto("/settings/wifi");

      await expect(page.getByTestId("wifi-unavailable")).toBeVisible({
        timeout: 15000,
      });
      // The network picker controls are not rendered.
      await expect(
        page.getByRole("button", { name: "Test Connection" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Save & Apply" }),
      ).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  test("shows the network picker with a gated Save on a WiFi-capable device", async ({
    browser,
    request,
  }) => {
    test.skip(!NMCLI, "device has no nmcli; the unavailable page is shown");

    const page = await newParticipant(browser);
    try {
      await unlockSettings(page, request);
      await page.goto("/settings/wifi");

      await expect(page.getByText("Network")).toBeVisible({ timeout: 15000 });
      await expect(page.getByPlaceholder("Enter WiFi password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Test Connection" }),
      ).toBeVisible();
      // Save & Apply stays disabled until a successful test of the selected
      // network (test-of-same-SSID gating).
      await expect(
        page.getByRole("button", { name: "Save & Apply" }),
      ).toBeDisabled();
    } finally {
      await page.context().close();
    }
  });
});
