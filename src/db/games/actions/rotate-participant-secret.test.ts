import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db/games";
import { rotateParticipantSecret } from "./rotate-participant-secret";

/** A db whose update().set().where().returning() resolves to `rows`. */
function stubDb(rows: unknown[]) {
  const set = vi.fn(() => ({
    where: () => ({ returning: () => Promise.resolve(rows) }),
  }));
  const update = vi.fn(() => ({ set }));
  return { db: { update }, update, set };
}

describe("rotateParticipantSecret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    await expect(
      rotateParticipantSecret("g1", "A1NS", "new-secret"),
    ).resolves.toBe(false);
  });

  it("updates the seat's secret and returns true when a row is updated", async () => {
    const { db, set } = stubDb([{ initialSeat: "A1NS" }]);
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(
      rotateParticipantSecret("g1", "A1NS", "new-secret"),
    ).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith({ secretKey: "new-secret" });
  });

  it("returns false when no pair is seated at the seat", async () => {
    const { db } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(
      rotateParticipantSecret("g1", "A1NS", "new-secret"),
    ).resolves.toBe(false);
  });
});
