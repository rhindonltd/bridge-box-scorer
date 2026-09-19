import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({
  adminKeyExists: vi.fn(),
  setAdminKey: vi.fn(),
}));
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));
vi.mock("@/db/system/admin-key-file", () => ({
  adminKeyDataDir: vi.fn(() => "/data"),
  adminKeyFilePath: vi.fn(() => "/data/admin-key.txt"),
}));

import fs from "fs";
import { adminKeyExists, setAdminKey } from "@/db/system/queries/admin-key";
import { generateAdminKey, seedAdminKey } from "./seed-admin-key";

describe("generateAdminKey", () => {
  const ALLOWED = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;

  it("produces an 8-character key from the unambiguous alphabet", () => {
    const key = generateAdminKey();
    expect(key).toHaveLength(8);
    expect(key).toMatch(ALLOWED);
  });

  it("never includes visually ambiguous characters (0, O, 1, I, L)", () => {
    // Sample many keys so the assertion is meaningful, not a lucky draw.
    for (let i = 0; i < 1000; i++) {
      const key = generateAdminKey();
      expect(key).not.toMatch(/[0O1IL]/);
    }
  });

  it("is random — successive keys differ", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateAdminKey());
    }
    // With ~40 bits of entropy, 100 draws colliding would be astronomically
    // unlikely; allow no more than a single coincidental collision.
    expect(keys.size).toBeGreaterThanOrEqual(99);
  });
});

describe("seedAdminKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and writes nothing when a key already exists", async () => {
    vi.mocked(adminKeyExists).mockResolvedValue(true);

    const result = await seedAdminKey();

    expect(result).toBeNull();
    expect(setAdminKey).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("seeds a key, stores its hash, and writes the label file (creating the dir)", async () => {
    vi.mocked(adminKeyExists).mockResolvedValue(false);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const key = await seedAdminKey();

    expect(key).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(setAdminKey).toHaveBeenCalledWith(key);
    expect(fs.mkdirSync).toHaveBeenCalledWith("/data", { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/data/admin-key.txt",
      `${key}\n`,
      { mode: 0o600 },
    );
  });

  it("does not re-create the data dir when it already exists", async () => {
    vi.mocked(adminKeyExists).mockResolvedValue(false);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await seedAdminKey();

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
