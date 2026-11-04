import { describe, it, expect } from "vitest";
import { buildExportReadiness } from "./export-readiness";

const allReady = {
  totalPlayable: 24,
  finalized: 24,
  clubConfigured: true,
  bridgewebsConfigured: true,
  ebuConfigured: true,
};

function itemsById(input: Parameters<typeof buildExportReadiness>[0]) {
  return new Map(buildExportReadiness(input).map((i) => [i.id, i]));
}

describe("buildExportReadiness", () => {
  it("marks everything ready when all results are in and everything is configured", () => {
    const items = itemsById(allReady);
    expect(items.get("results")?.level).toBe("ready");
    expect(items.get("results")?.detail).toBe("All 24 results are in.");
    expect(items.get("club")?.level).toBe("ready");
    expect(items.get("bridgewebs")?.level).toBe("ready");
    expect(items.get("ebu")?.level).toBe("ready");
  });

  it("warns with the outstanding count when some results are missing", () => {
    const items = itemsById({ ...allReady, finalized: 21 });
    const results = items.get("results")!;
    expect(results.level).toBe("warning");
    expect(results.detail).toBe("3 of 24 results are outstanding.");
  });

  it("uses the singular form when exactly one result is outstanding", () => {
    const items = itemsById({ ...allReady, finalized: 23 });
    expect(items.get("results")?.detail).toBe(
      "1 of 24 results is outstanding.",
    );
  });

  it("warns when there are no results in yet", () => {
    const items = itemsById({ ...allReady, totalPlayable: 0, finalized: 0 });
    const results = items.get("results")!;
    expect(results.level).toBe("warning");
    expect(results.detail).toContain("No results are in yet");
  });

  it("flags missing club information as a hard blocker", () => {
    const items = itemsById({ ...allReady, clubConfigured: false });
    expect(items.get("club")?.level).toBe("blocker");
    expect(items.get("club")?.detail).toMatch(/Settings/);
  });

  it("treats unconfigured BridgeWebs / EBU as optional info, not a blocker", () => {
    const items = itemsById({
      ...allReady,
      bridgewebsConfigured: false,
      ebuConfigured: false,
    });
    expect(items.get("bridgewebs")?.level).toBe("info");
    expect(items.get("ebu")?.level).toBe("info");
  });

  it("returns the items in a stable order", () => {
    expect(buildExportReadiness(allReady).map((i) => i.id)).toEqual([
      "results",
      "club",
      "bridgewebs",
      "ebu",
    ]);
  });

  describe("outstanding board details", () => {
    const outstandingBoards = [
      {
        section: "A",
        tableNumber: 2,
        boardNumber: 7,
        roundNumber: 3,
        nsPair: "Alice Smith & Bob Jones",
        ewPair: "Carol May & Dan Fox",
      },
    ];

    it("attaches the board breakdown to the results item when supplied", () => {
      const items = itemsById({
        ...allReady,
        finalized: 23,
        outstandingBoards,
      });
      const results = items.get("results")!;
      expect(results.boards).toHaveLength(1);
      expect(results.boards?.[0]).toEqual({
        id: "A-2-7",
        title: "Round 3 · Table 2 · Board 7",
        players: "Alice Smith & Bob Jones vs Carol May & Dan Fox",
      });
    });

    it("omits the section from the title for a single-section event", () => {
      const items = itemsById({
        ...allReady,
        finalized: 23,
        outstandingBoards,
        multiSection: false,
      });
      expect(items.get("results")?.boards?.[0].title).toBe(
        "Round 3 · Table 2 · Board 7",
      );
    });

    it("includes the section in the title for a multi-section event", () => {
      const items = itemsById({
        ...allReady,
        finalized: 23,
        outstandingBoards,
        multiSection: true,
      });
      expect(items.get("results")?.boards?.[0].title).toBe(
        "Round 3 · Section A · Table 2 · Board 7",
      );
    });

    it("omits the breakdown when no boards are supplied (just the count)", () => {
      const items = itemsById({ ...allReady, finalized: 23 });
      expect(items.get("results")?.boards).toBeUndefined();
    });

    it("renders an empty-seat side as a dash", () => {
      const items = itemsById({
        ...allReady,
        finalized: 23,
        outstandingBoards: [{ ...outstandingBoards[0], ewPair: null }],
      });
      expect(items.get("results")?.boards?.[0].players).toBe(
        "Alice Smith & Bob Jones vs —",
      );
    });

    it("never attaches a breakdown to the all-results-in (ready) item", () => {
      const items = itemsById({ ...allReady, outstandingBoards });
      const results = items.get("results")!;
      expect(results.level).toBe("ready");
      expect(results.boards).toBeUndefined();
    });
  });
});
