// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Fills the system-database coverage gaps left by system.int.test.ts:
 *  - seedAdminKey (generates + persists a random key and writes the label file
 *    when absent, no-ops when a key already exists);
 *  - the "no stored hash -> false" early returns in verifyAdminKey and
 *    verifyDirectorPassword;
 *  - the synchronous getSystemDb helper behind findLoginSession, including its
 *    "data dir missing -> mkdir" branch.
 */
describe("system db: coverage gaps", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("system");
    await harness.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    harness.teardown();
  });

  it("seedAdminKey generates a verifiable key and writes the label file", async () => {
    const { seedAdminKey } = await import("@/db/system/seed-admin-key");
    const { adminKeyExists, verifyAdminKey } = await import(
      "@/db/system/queries/admin-key"
    );
    const { adminKeyFilePath } = await import("@/db/system/admin-key-file");

    expect(await adminKeyExists()).toBe(false);

    const seeded = await seedAdminKey();
    expect(seeded).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);

    // The stored hash verifies against the returned plaintext.
    expect(await adminKeyExists()).toBe(true);
    expect(await verifyAdminKey(seeded!)).toBe(true);

    // The plaintext label file holds exactly the same key (trailing newline).
    const fileContents = fs.readFileSync(adminKeyFilePath(), "utf8");
    expect(fileContents.trim()).toBe(seeded);
  });

  it("seedAdminKey is a no-op when an admin key already exists", async () => {
    const { seedAdminKey } = await import("@/db/system/seed-admin-key");
    const { setAdminKey } = await import("@/db/system/queries/admin-key");

    await setAdminKey("existing-key");
    expect(await seedAdminKey()).toBeNull();
  });

  it("verifyAdminKey returns false when no admin key has been stored", async () => {
    const { verifyAdminKey } = await import("@/db/system/queries/admin-key");
    expect(await verifyAdminKey("anything")).toBe(false);
  });

  it("verifyDirectorPassword returns false when no password has been set", async () => {
    const { verifyDirectorPassword } = await import(
      "@/db/system/queries/login-sessions"
    );
    expect(await verifyDirectorPassword("anything")).toBe(false);
  });

  it("findLoginSession reads a session through the synchronous getSystemDb", async () => {
    const { createLoginSession } = await import(
      "@/db/system/actions/create-login-session"
    );
    const { findLoginSession } = await import(
      "@/db/system/queries/find-login-session"
    );

    await createLoginSession({ token: "tok-1", gameId: "g1", role: "DIRECTOR" });

    expect(findLoginSession("tok-1")).toMatchObject({ token: "tok-1" });
    expect(findLoginSession("missing")).toBeNull();
  });

  it("getSystemDb falls back to the built-in data dir when DATABASE_URL is unset", async () => {
    // Exercise the `?? "<default>"` branch in getSystemDb. The default is a
    // real production path, so stub fs + the sqlite driver so nothing touches
    // disk and the query resolves to no session.
    delete process.env.DATABASE_URL;
    vi.resetModules();

    vi.doMock("fs", () => ({
      default: { existsSync: () => true, mkdirSync: () => undefined },
      existsSync: () => true,
      mkdirSync: () => undefined,
    }));
    vi.doMock("better-sqlite3", () => ({
      default: class FakeDatabase {
        pragma() {}
        close() {}
      },
    }));
    vi.doMock("drizzle-orm/better-sqlite3", () => ({
      drizzle: () => ({
        select: () => ({
          from: () => ({ where: () => ({ get: () => undefined }) }),
        }),
      }),
    }));

    const { findLoginSession } = await import(
      "@/db/system/queries/find-login-session"
    );
    expect(findLoginSession("tok")).toBeNull();

    vi.doUnmock("fs");
    vi.doUnmock("better-sqlite3");
    vi.doUnmock("drizzle-orm/better-sqlite3");
  });

  it("getSystemDb creates the data dir when it does not exist", async () => {
    // Point DATABASE_URL at a not-yet-created directory so getSystemDb takes
    // its `!existsSync -> mkdir` branch, then confirm the dir was created.
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "bbs-sys-mkdir-"));
    const dataDir = path.join(parent, "nested-system");
    process.env.DATABASE_URL = dataDir;
    vi.resetModules();

    try {
      expect(fs.existsSync(dataDir)).toBe(false);
      const { findLoginSession } = await import(
        "@/db/system/queries/find-login-session"
      );
      // No session table row yet (fresh, unmigrated file) — but the getSystemDb
      // path (dir creation + drizzle open) still runs. Querying an unmigrated
      // db throws, so we only assert the directory was created.
      expect(() => findLoginSession("tok")).toThrow();
      expect(fs.existsSync(dataDir)).toBe(true);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });
});
