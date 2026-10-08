"use client";

type Props = {
  /** Enter a played contract (the normal Level → … → Confirm flow). */
  onEnterContract: () => void;
  /** Award an artificial adjusted score (A<ns>/<ew>). */
  onAdjustedScore: () => void;
  /** Award a weighted assigned score (W…). */
  onWeightedScore: () => void;
  /** Cancel / foul the board (assigns a §3.3.2 adjusted score). */
  onCancelBoard: () => void;
  /**
   * Remove this board from a TEAMS match (§3.3.7 ±3 IMP indemnity). Only
   * provided for IMP-based teams games; omitted (and the button hidden) for
   * pairs and board-comparison teams.
   */
  onRemoveTeamsBoard?: () => void;
  /**
   * Void the whole TEAMS match (§3.3.6.1 / §3.3.9). Only provided for teams
   * games; omitted (and the button hidden) otherwise.
   */
  onVoidTeamsMatch?: () => void;
  /**
   * Void the whole SWISS-PAIRS match (§3.3.8/§3.3.9). Only provided for Swiss
   * Pairs games; omitted (and the button hidden) otherwise.
   */
  onVoidPairsMatch?: () => void;
  /**
   * Declare this SWISS match a mismatch (§3.5). Only provided for Swiss games
   * (pairs or teams); omitted (and the button hidden) otherwise.
   */
  onMismatch?: () => void;
};

/**
 * The director's adjustment hub: the first screen after tapping a traveller
 * row. It routes to one of the ways a director can set a board's result —
 * entering a played contract, awarding an artificial adjusted score, awarding a
 * weighted assigned score, cancelling/fouling the board (§3.3.2), or (teams IMP
 * games only) removing the board from the match (§3.3.7). Players never see
 * this; it is reached only from the director traveller.
 */
export function StepAdjustmentType({
  onEnterContract,
  onAdjustedScore,
  onWeightedScore,
  onCancelBoard,
  onRemoveTeamsBoard,
  onVoidTeamsMatch,
  onVoidPairsMatch,
  onMismatch,
}: Props) {
  return (
    <div className="flex-1 flex flex-col gap-3 p-4 min-h-0">
      <button
        type="button"
        onClick={onEnterContract}
        className="py-4 rounded-xl text-center border-2 border-gray-300 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-lg font-semibold text-gray-900"
      >
        Enter Contract
      </button>

      <button
        type="button"
        onClick={onAdjustedScore}
        className="py-4 rounded-xl text-center border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 active:scale-[0.98] transition text-lg font-semibold text-amber-800"
      >
        Adjusted Score
      </button>

      <button
        type="button"
        onClick={onWeightedScore}
        className="py-4 rounded-xl text-center border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 active:scale-[0.98] transition text-lg font-semibold text-purple-800"
      >
        Weighted Score
      </button>

      <button
        type="button"
        onClick={onCancelBoard}
        className="py-4 rounded-xl text-center border-2 border-red-300 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition text-lg font-semibold text-red-800"
      >
        Cancel / Foul Board
      </button>

      {onRemoveTeamsBoard && (
        <button
          type="button"
          onClick={onRemoveTeamsBoard}
          className="py-4 rounded-xl text-center border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 active:scale-[0.98] transition text-lg font-semibold text-orange-800"
        >
          Board Not Played (Teams)
        </button>
      )}

      {onVoidTeamsMatch && (
        <button
          type="button"
          onClick={onVoidTeamsMatch}
          className="py-4 rounded-xl text-center border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] transition text-lg font-semibold text-rose-800"
        >
          Void Match (Teams)
        </button>
      )}

      {onVoidPairsMatch && (
        <button
          type="button"
          onClick={onVoidPairsMatch}
          className="py-4 rounded-xl text-center border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] transition text-lg font-semibold text-rose-800"
        >
          Void Match (Pairs)
        </button>
      )}

      {onMismatch && (
        <button
          type="button"
          onClick={onMismatch}
          className="py-4 rounded-xl text-center border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 active:scale-[0.98] transition text-lg font-semibold text-sky-800"
        >
          Mismatch (Swiss)
        </button>
      )}
    </div>
  );
}
