import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { resolveMigrationsFolder } from "./resolve-migrations-folder";

describe("resolveMigrationsFolder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first candidate root that actually contains the migrations", () => {
    const expected = path.join(process.cwd(), "drizzle", "games");
    const spy = vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return p === path.join(expected, "meta", "_journal.json");
    });

    expect(resolveMigrationsFolder("games")).toBe(expected);
    expect(spy).toHaveBeenCalled();
  });

  it("falls back to the cwd-relative path when no candidate has the journal", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(resolveMigrationsFolder("system")).toBe("./drizzle/system");
  });
});
