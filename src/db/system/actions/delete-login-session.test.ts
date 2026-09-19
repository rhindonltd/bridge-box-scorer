import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db/system";
import { deleteLoginSession } from "./delete-login-session";

describe("deleteLoginSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the session row for the given token", async () => {
    const where = vi.fn(() => Promise.resolve());
    const del = vi.fn(() => ({ where }));
    vi.mocked(getDb).mockResolvedValue({ delete: del } as never);

    await deleteLoginSession("tok-123");

    expect(del).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
