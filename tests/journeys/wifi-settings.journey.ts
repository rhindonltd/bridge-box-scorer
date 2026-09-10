import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";

import { unlockSettings } from "../fixtures/settings";
import { newParticipant } from "./support";

/**
 * WiFi settings journey — capability-aware.
 *
 * The WiFi screen adapts to whether the device can manage WiFi (has `nmcli`),
 * which it learns from `GET /api/system/network` (not from a scan — scanning is
 * disruptive and never runs automatically). On a device WITHOUT `nmcli` (dev
 * machines / CI) the UI shows a "WiFi settings can't be changed on this device"
 * page instead of the network picker. On a device WITH `nmcli` it shows the
 * picker with an explicit "Scan for networks" button and a Save gated on a
 * successful connection test.
 *
 * These assertions match whichever the host actually is, so the journey passes
 * on both. WiFi settings are behind the admin-key gate; `unlockSettings` seeds
 * a valid admin token first.
 *
 * On the appliance the single WiFi radio hosts the hotspot, so both scanning
 * and testing take that hotspot down momentarily (the radio can't scan or
 * associate while hosting the AP). Scanning is therefore an explicit,
 * admin-gated action that disconnects and reconnects the device; the picker
 * carries a persistent interruption warning. The disruptive scan/test cycles
 * (real AP-down/scan/AP-up, real association) need a real `nmcli`/WiFi host and
 * are verified manually — see tests/E2E-COVERAGE-AUDIT.md.
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
  test("network API reports WiFi-management availability matching the host", async ({
    request,
  }) => {
    // Capability is read from the network endpoint (a scan is disruptive and
    // no longer runs on load).
    const res = await request.get("/api/system/network");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.wifi.available).toBe(NMCLI);
  });

  test("scan API is admin-gated", async ({ request }) => {
    // The scan is a disruptive device operation, so it requires an admin token.
    const res = await request.post("/api/system/wifi/scan");
    expect(res.status()).toBe(401);
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

      // The screen warns that scanning/testing briefly interrupt the box's own
      // WiFi (both take the single radio off the hosted AP momentarily).
      await expect(
        page.getByTestId("wifi-interruption-warning"),
      ).toBeVisible();

      // Scanning is explicit (never automatic). Before any scan the picker is
      // empty and offers a "Scan for networks" action; we do not trigger it in
      // this journey because it would disconnect the test browser.
      await expect(
        page.getByRole("button", { name: "Scan for networks" }),
      ).toBeVisible();
      await expect(page.getByTestId("wifi-no-scan-yet")).toBeVisible();

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
