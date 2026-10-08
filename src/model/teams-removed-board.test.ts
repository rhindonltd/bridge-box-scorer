import { describe, it, expect } from "vitest";
import {
  buildRemovedTeamsBoard,
  isRemovedTeamsBoard,
  parseRemovedTeamsBoard,
  removedBoardNsSwing,
  REMOVED_BOARD_IMPS,
  TeamsRemovalFault,
} from "./teams-removed-board";

describe("teams-removed-board token", () => {
  const faults: TeamsRemovalFault[] = [
    "EW_FAULT",
    "NS_FAULT",
    "BOTH_FAULT",
    "NEITHER_FAULT",
  ];

  it("round-trips every fault through build/parse", () => {
    for (const fault of faults) {
      const token = buildRemovedTeamsBoard(fault);
      expect(isRemovedTeamsBoard(token)).toBe(true);
      expect(parseRemovedTeamsBoard(token)).toBe(fault);
    }
  });

  it("rejects non-removal outcomes", () => {
    expect(isRemovedTeamsBoard("3NTN=")).toBe(false);
    expect(isRemovedTeamsBoard("A60/40")).toBe(false);
    expect(isRemovedTeamsBoard("W100*3NTN=")).toBe(false);
    expect(parseRemovedTeamsBoard("TRM:NOPE")).toBeNull();
    expect(parseRemovedTeamsBoard("TRM:")).toBeNull();
  });
});

describe("removedBoardNsSwing", () => {
  it("awards +3 to NS when the opponents (EW) are at fault", () => {
    expect(removedBoardNsSwing("EW_FAULT")).toBe(REMOVED_BOARD_IMPS);
  });

  it("awards -3 to NS when NS are at fault", () => {
    expect(removedBoardNsSwing("NS_FAULT")).toBe(-REMOVED_BOARD_IMPS);
  });

  it("nets to 0 for neither-at-fault (both +3)", () => {
    expect(removedBoardNsSwing("NEITHER_FAULT")).toBe(0);
  });

  it("nets to 0 for both-at-fault (both -3)", () => {
    expect(removedBoardNsSwing("BOTH_FAULT")).toBe(0);
  });
});
