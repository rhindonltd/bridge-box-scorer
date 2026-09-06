import { test, expect, APIRequestContext } from "@playwright/test";

import { deriveAdminKey } from "../fixtures/settings";
import { newParticipant } from "./support";

/**
 * Admin-key journey: the device settings gate and the admin-key APIs.
 *
 * The factory-default admin key is derived from the host MAC (see
 * `deriveAdminKey`). These tests use the real key to unlock the settings gate,
 * verify the admin-key APIs, and exercise a full key-change cycle — always
 * restoring the ORIGINAL key at the end (guarded), since other settings tests
 * derive it.
 */

async function verifyKey(
  request: APIRequestContext,
  key: string,
): Promise<{ status: number; token?: string }> {
  const res = await request.post("/api/system/admin-key/verify", {
    data: { key },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), token: body?.result?.adminToken };
}

test.describe("Admin-key settings gate", () => {
  test("the gate unlocks with the correct key and rejects a wrong one", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const key = deriveAdminKey();
    test.skip(!key, "could not derive the device admin key on this host");

    const page = await newParticipant(browser);
    try {
      // A fresh context has no admin token: /settings shows the gate.
      await page.goto("/settings");
      await expect(page.getByText("Admin Access")).toBeVisible({
        timeout: 15000,
      });

      // Wrong key -> inline error, still gated.
      await page.locator("#admin-key").fill("wrong-key-xyz");
      await page.getByRole("button", { name: "Unlock" }).click();
      await expect(page.getByText("Incorrect admin key")).toBeVisible({
        timeout: 15000,
      });

      // Correct key -> the settings menu (WiFi / Club links) appears.
      await page.locator("#admin-key").fill(key!);
      await page.getByRole("button", { name: "Unlock" }).click();
      await expect(
        page.getByRole("link", { name: "WiFi Settings" }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await page.context().close();
    }
  });
});

test.describe("Admin-key APIs", () => {
  test("verify returns a token for the right key and 401/400 otherwise", async ({
    request,
  }) => {
    const key = deriveAdminKey();
    test.skip(!key, "could not derive the device admin key on this host");

    // Correct key -> 200 + token.
    const ok = await verifyKey(request, key!);
    expect(ok.status).toBe(200);
    expect(ok.token).toBeTruthy();

    // Wrong key -> 401.
    const bad = await verifyKey(request, "definitely-not-the-key");
    expect(bad.status).toBe(401);

    // Missing key -> 400.
    const missing = await request.post("/api/system/admin-key/verify", {
      data: {},
    });
    expect(missing.status()).toBe(400);
  });

  test("update rejects short keys and unauthenticated calls", async ({
    request,
  }) => {
    const key = deriveAdminKey();
    test.skip(!key, "could not derive the device admin key on this host");

    const token = (await verifyKey(request, key!)).token!;

    // < 4 chars -> 400 (non-destructive: the key is not changed).
    const short = await request.post("/api/system/admin-key", {
      headers: { "x-admin-token": token },
      data: { key: "abc" },
    });
    expect(short.status()).toBe(400);

    // No admin token -> 401.
    const noAuth = await request.post("/api/system/admin-key", {
      data: { key: "a-valid-length-key" },
    });
    expect(noAuth.status()).toBe(401);
  });

  test("a full key change takes effect and is then restored", async ({
    request,
  }) => {
    test.setTimeout(60_000);

    const originalKey = deriveAdminKey();
    test.skip(!originalKey, "could not derive the device admin key on this host");

    const newKey = "e2e-temp-key-1234";
    const token = (await verifyKey(request, originalKey!)).token!;
    expect(token).toBeTruthy();

    let changed = false;
    try {
      // Change the key.
      const change = await request.post("/api/system/admin-key", {
        headers: { "x-admin-token": token },
        data: { key: newKey },
      });
      expect(change.ok()).toBe(true);
      changed = true;

      // The new key verifies; the original key is now rejected.
      expect((await verifyKey(request, newKey)).status).toBe(200);
      expect((await verifyKey(request, originalKey!)).status).toBe(401);
    } finally {
      // Restore the original key so the derived-key assumption holds for other
      // tests. The session token stays valid across key changes (it is a
      // minted session, independent of the key value).
      if (changed) {
        const restore = await request.post("/api/system/admin-key", {
          headers: { "x-admin-token": token },
          data: { key: originalKey! },
        });
        expect(restore.ok()).toBe(true);
        // Confirm the original key works again.
        expect((await verifyKey(request, originalKey!)).status).toBe(200);
      }
    }
  });
});
