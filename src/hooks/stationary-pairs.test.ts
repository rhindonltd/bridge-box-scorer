import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({ default: (...a: unknown[]) => mockUseSWR(...a) }));

import { useMovementResolution } from "./stationary-pairs";
import type { SelectedMovement } from "@/model/selected-movement";

describe("useMovementResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined });
  });

  it("returns empty maps when no movement is selected", () => {
    const { result } = renderHook(() =>
      useMovementResolution(null, 5),
    );
    expect(result.current.stationary.size).toBe(0);
    expect(result.current.placement.size).toBe(0);
    expect(result.current.movementTables).toBe(0);
  });

  describe("SWISS", () => {
    const swiss = (
      tables: number,
      stationaryPairs?: number[],
    ): SelectedMovement => ({
      source: "SWISS",
      swiss: { tables, rounds: 7, boardsPerRound: 3, stationaryPairs },
    });

    it("marks the designated stationary pairs at their home table/direction", () => {
      const { result } = renderHook(() =>
        // pair 1 -> table 1 NS; pair (tables+2) -> table 2 EW
        useMovementResolution(swiss(4, [1, 6]), 4),
      );

      expect(result.current.movementTables).toBe(4);
      expect(result.current.stationary.get(1)).toEqual({ ns: true, ew: false });
      expect(result.current.stationary.get(2)).toEqual({ ns: false, ew: true });
      // Round-1 boards are the same set (1..boardsPerRound) at every table.
      expect(result.current.placement.get(1)).toEqual({
        boardStart: 1,
        boardEnd: 3,
      });
    });

    it("returns empty stationary/placement (but reports tables) on a table-count mismatch", () => {
      const { result } = renderHook(() =>
        useMovementResolution(swiss(6), 4),
      );
      expect(result.current.stationary.size).toBe(0);
      expect(result.current.placement.size).toBe(0);
      expect(result.current.movementTables).toBe(6);
    });

    it("defaults all directions to non-stationary when no pairs are designated", () => {
      const { result } = renderHook(() =>
        useMovementResolution(swiss(3), 3),
      );
      expect(result.current.stationary.get(1)).toEqual({
        ns: false,
        ew: false,
      });
    });

    // A stationary pair id out of range for the table count (e.g. a stale id
    // left over after the section was resized down) maps to a home table that
    // isn't in the stationary map, so it is skipped rather than throwing.
    it("ignores a stationary pair id whose home table is out of range", () => {
      // tables=3 => valid pair ids are 1..6. Pair 99 maps to table 96, absent.
      const { result } = renderHook(() =>
        useMovementResolution(swiss(3, [99]), 3),
      );
      expect(result.current.stationary.get(1)).toEqual({
        ns: false,
        ew: false,
      });
      expect(result.current.stationary.get(3)).toEqual({
        ns: false,
        ew: false,
      });
    });
  });

  describe("MITCHELL", () => {
    const mitchell = (tables: number): SelectedMovement => ({
      source: "MITCHELL",
      mitchell: { tables, rounds: tables, boardsPerRound: 2 },
    });

    it("resolves per-table facts from the generated movement", () => {
      const { result } = renderHook(() =>
        useMovementResolution(mitchell(5), 5),
      );
      expect(result.current.movementTables).toBe(5);
      expect(result.current.placement.size).toBe(5);
      // A standard Mitchell keeps NS stationary and EW moving.
      expect(result.current.stationary.get(1)).toEqual({ ns: true, ew: false });
    });

    it("returns empty when the generated table count doesn't match the section", () => {
      const { result } = renderHook(() =>
        useMovementResolution(mitchell(5), 4),
      );
      expect(result.current.stationary.size).toBe(0);
      expect(result.current.movementTables).toBe(5);
    });

    it("degrades to empty when Mitchell generation throws", () => {
      // 1 table is not a valid Mitchell and makes the generator throw.
      const bad: SelectedMovement = {
        source: "MITCHELL",
        mitchell: { tables: 1, rounds: 1, boardsPerRound: 2 },
      };
      const { result } = renderHook(() =>
        useMovementResolution(bad, 1),
      );
      expect(result.current.movementTables).toBe(0);
    });
  });

  describe("AMERICAN_WHIST_TEAMS", () => {
    const americanWhist: SelectedMovement = {
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 3, boardsPerRound: 2 },
    };

    it("keeps each home pair stationary and moves the away pairs", () => {
      const { result } = renderHook(() =>
        useMovementResolution(americanWhist, 3),
      );
      expect(result.current.movementTables).toBe(3);
      expect(result.current.stationary.get(1)).toEqual({ ns: true, ew: false });
      // Table 1 starts on board set 1.
      expect(result.current.placement.get(1)).toMatchObject({
        boardStart: 1,
        boardEnd: 2,
      });
    });
  });

  describe("HEAD_TO_HEAD_TEAMS", () => {
    it("sets out table 2 on the second half of the first stanza's boards", () => {
      const headToHead: SelectedMovement = {
        source: "HEAD_TO_HEAD_TEAMS",
        headToHeadTeams: { boardsPerRound: 12 },
      };
      const { result } = renderHook(() =>
        useMovementResolution(headToHead, 2),
      );
      expect(result.current.placement.get(2)).toMatchObject({
        boardStart: 7,
        boardEnd: 12,
      });
    });
  });
  describe("STAGGER_TEAMS", () => {
    it("keeps the home pairs stationary and sets out each pair of tables' set", () => {
      const stagger: SelectedMovement = {
        source: "STAGGER_TEAMS",
        staggerTeams: { teams: 6, boardsPerRound: 4 },
      };
      const { result } = renderHook(() => useMovementResolution(stagger, 6));
      expect(result.current.stationary.get(5)).toEqual({ ns: true, ew: false });
      // Tables 2 and 5 both start on set 2.
      expect(result.current.placement.get(5)).toMatchObject({
        boardStart: 5,
        boardEnd: 8,
      });
    });
  });
  describe("THURNER_TEAMS", () => {
    it("keeps the home pairs stationary and starts the satellite on table 1's boards", () => {
      const thurner: SelectedMovement = {
        source: "THURNER_TEAMS",
        thurnerTeams: { teams: 6, boardsPerRound: 3 },
      };
      const { result } = renderHook(() => useMovementResolution(thurner, 6));
      expect(result.current.stationary.get(6)).toEqual({ ns: true, ew: false });
      expect(result.current.placement.get(6)).toMatchObject({
        boardStart: 1,
        boardEnd: 3,
      });
    });
  });
  describe("CIRCULATION_TEAMS", () => {
    it("sets out each table's own share of the round's boards", () => {
      const circulation: SelectedMovement = {
        source: "CIRCULATION_TEAMS",
        circulationTeams: { boardsPerRound: 8 },
      };
      const { result } = renderHook(() =>
        useMovementResolution(circulation, 4),
      );
      expect(result.current.stationary.get(3)).toEqual({ ns: true, ew: false });
      expect(result.current.placement.get(3)).toMatchObject({
        boardStart: 5,
        boardEnd: 6,
      });
    });
  });
  describe("SPEC", () => {
    const spec: SelectedMovement = {
      source: "SPEC",
      specId: 7,
      boardsPerRound: 2,
    };

    it("returns empty while the movement detail is still loading", () => {
      mockUseSWR.mockReturnValue({ data: undefined });
      const { result } = renderHook(() =>
        useMovementResolution(spec, 2),
      );
      expect(result.current.movementTables).toBe(0);
    });

    it("resolves per-table facts from the fetched detail", () => {
      mockUseSWR.mockReturnValue({
        data: {
          tables: [
            { tableNumber: 1, rounds: [{ ns: "1", ew: "2", boards: [1, 2] }] },
            { tableNumber: 2, rounds: [{ ns: "3", ew: "4", boards: [1, 2] }] },
          ],
        },
      });
      const { result } = renderHook(() =>
        useMovementResolution(spec, 2),
      );
      expect(result.current.movementTables).toBe(2);
      expect(result.current.stationary.size).toBe(2);
    });

    it("returns empty on a SPEC table-count mismatch", () => {
      mockUseSWR.mockReturnValue({
        data: {
          tables: [
            { tableNumber: 1, rounds: [{ ns: "1", ew: "2", boards: [1, 2] }] },
          ],
        },
      });
      const { result } = renderHook(() =>
        useMovementResolution(spec, 4),
      );
      expect(result.current.stationary.size).toBe(0);
      expect(result.current.movementTables).toBe(1);
    });

    // isConstant() returns false for an empty label list: a table with zero
    // rounds has nothing to be stationary about.
    it("treats a table with no rounds as non-stationary (empty labels)", () => {
      mockUseSWR.mockReturnValue({
        data: {
          tables: [{ tableNumber: 1, rounds: [] }],
        },
      });
      const { result } = renderHook(() =>
        useMovementResolution(spec, 1),
      );
      expect(result.current.stationary.get(1)).toEqual({
        ns: false,
        ew: false,
      });
    });

    // isConstant() returns false when the first label is nullish: an undefined
    // direction label can't be a stable stationary pair.
    it("treats a nullish first label as non-stationary", () => {
      mockUseSWR.mockReturnValue({
        data: {
          tables: [
            {
              tableNumber: 1,
              // ns is present and constant; ew is missing on every round.
              rounds: [
                { ns: "1", boards: [1, 2] },
                { ns: "1", boards: [3, 4] },
              ],
            },
          ],
        },
      });
      const { result } = renderHook(() =>
        useMovementResolution(spec, 1),
      );
      expect(result.current.stationary.get(1)).toEqual({ ns: true, ew: false });
    });
  });
});
