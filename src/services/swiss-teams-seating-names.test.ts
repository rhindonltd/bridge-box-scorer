import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-teams", () => ({ findTeams: vi.fn() }));

import { findTeams } from "@/db/games/queries/find-teams";
import { resolveSwissTeamsMatchNames } from "./swiss-teams-seating-names";

function team(id: string, name: string) {
  return { type: "TEAM", id, name } as never;
}

describe("resolveSwissTeamsMatchNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findTeams).mockResolvedValue([
      team("A1NS", "Sharks"),
      team("A2NS", "Dragons"),
      team("A3NS", "Owls"),
      team("A4NS", "Eagles"),
    ]);
  });

  it("names both teams in each match", async () => {
    const result = await resolveSwissTeamsMatchNames(
      {} as never,
      "A",
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      null,
      null,
    );

    expect(result.matches).toEqual([
      { a: { teamId: 1, name: "Sharks" }, b: { teamId: 2, name: "Dragons" } },
      { a: { teamId: 3, name: "Owls" }, b: { teamId: 4, name: "Eagles" } },
    ]);
    expect(result.bye).toBeNull();
    expect(result.triple).toBeNull();
  });

  it("names the bye team", async () => {
    const result = await resolveSwissTeamsMatchNames(
      {} as never,
      "A",
      [{ a: 1, b: 2 }],
      3,
      null,
    );
    expect(result.bye).toEqual({ teamId: 3, name: "Owls" });
  });

  it("names all three teams of a triple", async () => {
    const result = await resolveSwissTeamsMatchNames(
      {} as never,
      "A",
      [],
      null,
      { a: 1, b: 2, c: 3 },
    );
    expect(result.triple).toEqual({
      a: { teamId: 1, name: "Sharks" },
      b: { teamId: 2, name: "Dragons" },
      c: { teamId: 3, name: "Owls" },
    });
  });

  it("falls back to 'Team {id}' for an unseated team", async () => {
    vi.mocked(findTeams).mockResolvedValue([team("A1NS", "Sharks")]);
    const result = await resolveSwissTeamsMatchNames(
      {} as never,
      "A",
      [{ a: 1, b: 2 }],
      null,
      null,
    );
    expect(result.matches[0].b).toEqual({ teamId: 2, name: "Team 2" });
  });
});
