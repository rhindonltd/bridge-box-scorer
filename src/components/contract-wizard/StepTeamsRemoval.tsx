"use client";

import { TeamsRemovalFault } from "@/model/teams-removed-board";

type Props = {
  onSubmit: (fault: TeamsRemovalFault) => void;
  /** Board-comparison teams (BAM/PAB): phrase the indemnity as board wins. */
  boardComparison?: boolean;
};

/**
 * The §3.3.7 fault choice for a board removed from a teams match. Each removed
 * board is given an artificial adjusted score of ±3 IMPs by who was at fault,
 * expressed relative to the table in front of the director (NS vs EW):
 *
 * - `EW_FAULT` — opponents (EW) at fault → NS +3 IMPs, EW −3.
 * - `NS_FAULT` — this table (NS) at fault → NS −3 IMPs, EW +3.
 * - `BOTH_FAULT` — both at fault → −3 to each (computed separately).
 * - `NEITHER_FAULT` — no one at fault / outside agency → +3 to each.
 *
 * Each option commits immediately on tap. (NEITHER/BOTH currently net to no
 * margin swing in the IMP-based scorers — see `model/teams-removed-board.ts`.)
 */

type Option = {
  fault: TeamsRemovalFault;
  title: string;
  /** Detail for IMP-based teams (VP / aggregate IMP). */
  impDetail: string;
  /** Detail for board-comparison teams (BAM/PAB). */
  boardDetail: string;
};

const OPTIONS: Option[] = [
  {
    fault: "EW_FAULT",
    title: "Opponents (EW) at fault",
    impDetail: "NS +3 IMPs, EW −3",
    boardDetail: "This table wins the board, opponents lose",
  },
  {
    fault: "NS_FAULT",
    title: "This table (NS) at fault",
    impDetail: "NS −3 IMPs, EW +3",
    boardDetail: "This table loses the board, opponents win",
  },
  {
    fault: "NEITHER_FAULT",
    title: "Neither side at fault",
    impDetail: "Outside agency — +3 IMPs to each",
    boardDetail: "Outside agency — board tied",
  },
  {
    fault: "BOTH_FAULT",
    title: "Both sides at fault",
    impDetail: "−3 IMPs to each",
    boardDetail: "Board tied",
  },
];

export function StepTeamsRemoval({ onSubmit, boardComparison = false }: Props) {
  const worth = boardComparison
    ? "scored as a won / tied / lost board"
    : "worth ±3 IMPs";
  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      <p className="text-sm text-gray-600 text-center mb-4">
        This board could not be played and is removed from the match. Choose who
        was at fault — each removed board is {worth}.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.fault}
            type="button"
            onClick={() => onSubmit(opt.fault)}
            className="py-4 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition"
          >
            <span className="block text-base font-semibold text-gray-900">
              {opt.title}
            </span>
            <span className="block text-sm text-gray-600">
              {boardComparison ? opt.boardDetail : opt.impDetail}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
