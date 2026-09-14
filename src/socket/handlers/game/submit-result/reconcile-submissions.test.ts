import { describe, it, expect } from "vitest";
import { reconcileSubmissions } from "./reconcile-submissions";
import { BoardSubmission } from "@/db/games/tables/submissions";

function sub(
  side: "NS" | "EW",
  boardNumber: number,
  result: string,
): BoardSubmission {
  return { side, boardNumber, result } as BoardSubmission;
}

describe("reconcileSubmissions", () => {
  it("is pending when only one side has submitted", () => {
    expect(reconcileSubmissions([sub("NS", 1, "3NTN=")])).toEqual({
      status: "pending",
    });
  });

  it("is pending when there are no submissions", () => {
    expect(reconcileSubmissions([])).toEqual({ status: "pending" });
  });

  it("is pending when both submissions are the same side", () => {
    // Defensive: two NS rows should never both persist, but if they did we
    // must not treat it as a confirmable pair.
    expect(
      reconcileSubmissions([sub("NS", 1, "3NTN="), sub("NS", 1, "3NTN=")]),
    ).toEqual({ status: "pending" });
  });

  it("confirms when both sides agree on board and result", () => {
    expect(
      reconcileSubmissions([sub("NS", 4, "4HS+1"), sub("EW", 4, "4HS+1")]),
    ).toEqual({ status: "confirmed", boardNumber: 4, result: "4HS+1" });
  });

  it("flags a mismatch when the results disagree", () => {
    expect(
      reconcileSubmissions([sub("NS", 3, "3NTN="), sub("EW", 3, "3NTN-1")]),
    ).toEqual({
      status: "mismatch",
      ns: { boardNumber: 3, result: "3NTN=" },
      ew: { boardNumber: 3, result: "3NTN-1" },
    });
  });

  it("flags a mismatch when the board numbers disagree", () => {
    expect(
      reconcileSubmissions([sub("NS", 1, "2SN+1"), sub("EW", 2, "2SN+1")]),
    ).toEqual({
      status: "mismatch",
      ns: { boardNumber: 1, result: "2SN+1" },
      ew: { boardNumber: 2, result: "2SN+1" },
    });
  });
});
