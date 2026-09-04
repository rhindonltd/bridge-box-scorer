// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Fills the system-database coverage gaps left by system.int.test.ts:
 *  - seedAdminKey (seeds when absent, no-ops when a key exists, no-ops when no
 *    MAC is available);
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

  const macInterfaces = {
    eth0: [
      {
        address: "192.168.1.5",
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "dc:a6:32:ab:cd:ef",
        internal: false,
        cidr: "192.168.1.5/24",
      },
    ],
  } as unknown as ReturnType<typeof os.networkInterfaces>;

  it("seedAdminKey seeds the MAC-derived default when no key exists", async () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue(macInterfaces);

    const { seedAdminKey } = await import("@/db/system/seed-admin-key");
    const { adminKeyExists, verifyAdminKey } = await import(
      "@/db/system/queries/admin-key"
    );

    expect(await adminKeyExists()).toBe(false);

    const seeded = await seedAdminKey();
    expect(seeded).toBe("ABCDEF");

    expect(await adminKeyExists()).toBe(true);
    expect(await verifyAdminKey("ABCDEF")).toBe(true);
  });

  it("seedAdminKey is a no-op when an admin key already exists", async () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue(macInterfaces);

    const { seedAdminKey } = await import("@/db/system/seed-admin-key");
    const { setAdminKey } = await import("@/db/system/queries/admin-key");

    await setAdminKey("existing-key");
    expect(await seedAdminKey()).toBeNull();
  });

  it("seedAdminKey returns null when no usable MAC address is found", async () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      lo: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
    } as unknown as ReturnType<typeof os.networkInterfaces>);

    const { seedAdminKey } = await import("@/db/system/seed-admin-key");
    expect(await seedAdminKey()).toBeNull();
  });

  it("deriveDefaultAdminKey skips interface names that map to undefined", async () => {
    // `interfaces[name]` can be undefined; the `?? []` guard must be exercised.
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      empty: undefined,
    } as unknown as ReturnType<typeof os.networkInterfaces>);

    const { deriveDefaultAdminKey } = await import(
      "@/db/system/seed-admin-key"
    );
    expect(deriveDefaultAdminKey()).toBeNull();
  });

  it("deriveDefaultAdminKey skips a MAC with fewer than 6 hex digits", async () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      eth0: [
        {
          address: "192.168.1.5",
          netmask: "255.255.255.0",
          family: "IPv4",
          // Strips to "AB" (2 hex digits) < 6, so it is skipped.
          mac: "a:b",
          internal: false,
          cidr: "192.168.1.5/24",
        },
      ],
    } as unknown as ReturnType<typeof os.networkInterfaces>);

    const { deriveDefaultAdminKey } = await import(
      "@/db/system/seed-admin-key"
    );
    expect(deriveDefaultAdminKey()).toBeNull();
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
    vi.doMock("better-sqlite3", () => ({ default: class FakeDatabase {} }));
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
