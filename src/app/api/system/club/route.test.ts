import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/db/system/actions/upsert-club", () => ({ upsertClub: vi.fn() }));

import { findClub } from "@/db/system/queries/find-club";
import { upsertClub } from "@/db/system/actions/upsert-club";
import * as appHandler from "./route";

describe("/api/system/club", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns the club", async () => {
    vi.mocked(findClub).mockResolvedValue({
      id: 1,
      name: "Club",
      clubNumber: "1",
    } as never);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { club: { id: 1, name: "Club", clubNumber: "1" } },
        });
      },
    });
  });

  it("POST upserts the club for a valid body", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ name: "New Club", clubNumber: "999" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        expect(upsertClub).toHaveBeenCalledWith("New Club", "999");
      },
    });
  });

  it("POST returns 400 for an invalid body", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ name: "New Club" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(400);
        expect(upsertClub).not.toHaveBeenCalled();
      },
    });
  });
});
