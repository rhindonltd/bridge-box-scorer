// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Integration coverage for the system database: club upsert/read, settings
 * upsert/read, share-code create + validate/claim lifecycle, login sessions,
 * and the director password round-trip — against a real migrated system.db.
 */
describe("system db", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("system");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("upserts and reads back the single club row", async () => {
    const { upsertClub } = await import("@/db/system/actions/upsert-club");
    const { findClub } = await import("@/db/system/queries/find-club");

    expect(await findClub()).toBeNull();

    await upsertClub("Bridge Club", "12345");
    expect(await findClub()).toMatchObject({
      id: 1,
      name: "Bridge Club",
      clubNumber: "12345",
    });

    // Upsert again updates in place (still id 1).
    await upsertClub("Renamed Club", "67890");
    expect(await findClub()).toMatchObject({
      id: 1,
      name: "Renamed Club",
      clubNumber: "67890",
    });
  });

  it("upserts and reads a setting (null when absent)", async () => {
    const { updateSetting } = await import("@/db/system/actions/update-setting");
    const { findSetting } = await import("@/db/system/queries/settings");

    expect(await findSetting("theme")).toBeNull();

    await updateSetting({ settingKey: "theme", settingValue: "dark" });
    expect(await findSetting("theme")).toBe("dark");

    await updateSetting({ settingKey: "theme", settingValue: "light" });
    expect(await findSetting("theme")).toBe("light");
  });

  it("creates a share code and claims it once", async () => {
    const { createShareCode } = await import(
      "@/db/system/actions/create-share-code"
    );
    const { validateAndClaimShareCode } = await import(
      "@/db/system/queries/validate-share-code"
    );

    const code = await createShareCode("game-1");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    // Case-insensitive claim succeeds and returns the gameId.
    const first = await validateAndClaimShareCode(code.toLowerCase());
    expect(first).toEqual({ valid: true, gameId: "game-1" });

    // Second claim fails: already used.
    const second = await validateAndClaimShareCode(code);
    expect(second).toEqual({ valid: false, error: "Code has already been used" });
  });

  it("rejects an unknown share code", async () => {
    const { validateAndClaimShareCode } = await import(
      "@/db/system/queries/validate-share-code"
    );
    expect(await validateAndClaimShareCode("ZZZZZZ")).toEqual({
      valid: false,
      error: "Invalid code",
    });
  });

  it("rejects an expired share code", async () => {
    const { validateAndClaimShareCode } = await import(
      "@/db/system/queries/validate-share-code"
    );
    const db = (await harness.getDb()) as {
      insert: (t: unknown) => { values: (v: unknown) => { run: () => void } };
    };
    const { shareCodes } = await import("@/db/system/schema");

    // Seed an already-expired code directly.
    db.insert(shareCodes)
      .values({
        code: "EXPIRE",
        gameId: "g",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        used: 0,
      })
      .run();

    expect(await validateAndClaimShareCode("EXPIRE")).toEqual({
      valid: false,
      error: "Code has expired",
    });
  });

  it("creates a login session and recognises the director token", async () => {
    const { createLoginSession } = await import(
      "@/db/system/actions/create-login-session"
    );
    const { isDirector } = await import("@/db/system/queries/login-sessions");

    await createLoginSession({ token: "tok-1", gameId: "g1", role: "director" });

    expect(await isDirector("tok-1")).toBe(true);
    expect(await isDirector("unknown")).toBe(false);
  });

  it("round-trips the director password (hashed, verifiable)", async () => {
    const {
      directorPasswordExists,
      setDirectorPassword,
      verifyDirectorPassword,
    } = await import("@/db/system/queries/login-sessions");

    expect(await directorPasswordExists()).toBe(false);

    await setDirectorPassword("hunter2");

    expect(await directorPasswordExists()).toBe(true);
    expect(await verifyDirectorPassword("hunter2")).toBe(true);
    expect(await verifyDirectorPassword("wrong")).toBe(false);
  });

  it("round-trips the admin key (hashed, verifiable)", async () => {
    const { adminKeyExists, setAdminKey, verifyAdminKey } = await import(
      "@/db/system/queries/admin-key"
    );

    expect(await adminKeyExists()).toBe(false);

    await setAdminKey("admin-secret");

    expect(await adminKeyExists()).toBe(true);
    expect(await verifyAdminKey("admin-secret")).toBe(true);
    expect(await verifyAdminKey("nope")).toBe(false);
  });

  it("validates an admin token only for an ADMIN login session", async () => {
    const { createLoginSession } = await import(
      "@/db/system/actions/create-login-session"
    );
    const { validateAdminToken } = await import(
      "@/db/system/queries/admin-key"
    );

    await createLoginSession({ token: "admin-tok", gameId: null, role: "ADMIN" });
    await createLoginSession({
      token: "dir-tok",
      gameId: "g1",
      role: "DIRECTOR",
    });

    expect(await validateAdminToken("admin-tok")).toBe(true);
    // A director token is not an admin token.
    expect(await validateAdminToken("dir-tok")).toBe(false);
    expect(await validateAdminToken("unknown")).toBe(false);
    expect(await validateAdminToken(null)).toBe(false);
  });
});
