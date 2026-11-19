import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/games", () => ({ requireGameDb: vi.fn() }));
import { requireGameDb } from "@/db/games";
import {
  deleteSideSubmission,
  deleteBoardSubmissions,
} from "./delete-submissions";
describe("delete-submissions", () => {
  const where = vi.fn();
  const del = vi.fn(() => ({ where }));
  beforeEach(() => {
    vi.clearAllMocks();
    where.mockResolvedValue(undefined);
    vi.mocked(requireGameDb).mockResolvedValue({ delete: del } as never);
  });
  it("deleteSideSubmission deletes one side's rows for the game", async () => {
    await deleteSideSubmission("g1", "A", 3, 2, "EW");
    expect(requireGameDb).toHaveBeenCalledWith("g1");
    expect(del).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
  it("deleteBoardSubmissions deletes both sides' rows for the game", async () => {
    await deleteBoardSubmissions("g1", "A", 3, 2);
    expect(requireGameDb).toHaveBeenCalledWith("g1");
    expect(del).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
