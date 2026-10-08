import {
  drawSwissRound,
  type SwissDrawInput,
  type SwissSeating,
  type SwissPairId,
} from "@/movement/swiss/swiss-pairing";
import { MismatchDirection } from "@/model/swiss-mismatch";

/**
 * EBU White Book §3.5 mismatch DETECTION (pairs).
 *
 * A mismatch arises when a round is drawn from standings that later change —
 * typically because a director awards an adjusted score on an EARLIER round
 * after a subsequent round has already been drawn and played. The committed
 * draw then no longer matches the draw the CORRECTED standings would have
 * produced, so some pairs played opponents they "shouldn't" have.
 *
 * Because the Swiss draw is deterministic, we can reconstruct the "correct"
 * draw: re-run {@link drawSwissRound} on the corrected as-of-round-R input and
 * compare each pair's correct opponent to the opponent it ACTUALLY played. When
 * the two opponents differ and their CURRENT VP totals are more than 5 apart
 * (the §3.5 threshold, 20–0 scale), the pair is a mismatch CANDIDATE.
 *
 * This module only finds candidates — it does not rule. The §3.5 "several valid
 * alternatives" exception and the fault attribution are director judgements, so
 * a candidate carries the computed facts (actual vs correct opponent, their
 * VPs, the higher/lower direction) and the director confirms and sets fault,
 * which then feeds the one-sided §3.5.2 adjustment.
 */

/** The > 5 VP threshold that makes an opponent swap a §3.5 mismatch. */
export const MISMATCH_VP_THRESHOLD = 5;

/** A detected (but un-ruled) mismatch for one pair in one round. */
export interface MismatchCandidate {
  roundNumber: number;
  /** The pair that was drawn against the wrong opponents (stable id). */
  mismatchedPair: SwissPairId;
  /** The opponent the pair actually played (stable id). */
  actualOpponent: SwissPairId;
  /** The opponent the corrected draw says it should have played. */
  correctOpponent: SwissPairId;
  /** Current VP total of the actual opponent. */
  actualOpponentVp: number;
  /** Current VP total of the correct opponent. */
  correctOpponentVp: number;
  /**
   * Whether the actual opponent currently out-scores (HIGHER) or trails (LOWER)
   * the correct opponent — the direction the §3.5.2 adjustment keys on.
   */
  direction: MismatchDirection;
}

/** Build a pair→opponent map from a drawn/ committed ordinary seating. */
function opponentsOf(seating: SwissSeating[]): Map<SwissPairId, SwissPairId> {
  const map = new Map<SwissPairId, SwissPairId>();
  for (const t of seating) {
    map.set(t.ns, t.ew);
    map.set(t.ew, t.ns);
  }
  return map;
}

/** Inputs for detecting mismatches in a single already-committed round. */
export interface DetectRoundInput {
  roundNumber: number;
  /**
   * The corrected as-of-round-R draw input: the history (rounds < R) and
   * standings the round-R draw SHOULD have used given today's board values.
   * Re-running the engine on this yields the "correct" opponents.
   */
  correctedInput: SwissDrawInput;
  /** Each ordinary pair's committed opponent that round, by stable id. */
  committedOpponentByPair: Map<SwissPairId, SwissPairId>;
  /** Current VP total per pair (stable id) for the > 5 comparison. */
  currentVpByPair: Map<SwissPairId, number>;
  /**
   * Pairs excluded from the committed round's ordinary diff — the 2-half-match
   * group (anchor + two non-anchors) and the bye pair. Only ORDINARY tables are
   * assessed; a pair in (or playing into) a half-match/bye is left to a manual
   * ruling.
   */
  committedExcludedPairs: ReadonlySet<SwissPairId>;
}

/**
 * Detect mismatch candidates for ONE committed round by replaying its draw on
 * the corrected input and diffing opponents.
 *
 * Returns one candidate per mismatched pair (so a swapped match yields up to
 * two candidates — each side is assessed independently, since §3.5 adjusts a
 * side only when it is the mismatched one). Only ORDINARY head-to-head tables
 * are assessed: a pair in a 2-half-matches group or on a bye — in EITHER the
 * committed round or the corrected replay — is excluded (its anchor has two
 * opponents, so the simple diff doesn't apply), while the rest of the round is
 * still checked. Such excluded cases are left to a manual director ruling.
 */
export function detectRoundMismatches(
  input: DetectRoundInput,
): MismatchCandidate[] {
  const {
    roundNumber,
    correctedInput,
    committedOpponentByPair,
    currentVpByPair,
    committedExcludedPairs,
  } = input;

  const correct = drawSwissRound(correctedInput);

  // Pairs the CORRECTED draw puts in a half-match group or on a bye are also
  // not clean head-to-heads; exclude them alongside the committed exclusions.
  const excluded = new Set<SwissPairId>(committedExcludedPairs);
  if (correct.sitOutPairId != null) excluded.add(correct.sitOutPairId);
  if (correct.halfMatch != null) {
    excluded.add(correct.halfMatch.group.anchor);
    excluded.add(correct.halfMatch.group.halfOneOpponent);
    excluded.add(correct.halfMatch.group.halfTwoOpponent);
  }

  const correctOpp = opponentsOf(correct.seating);
  const candidates: MismatchCandidate[] = [];

  for (const [pair, correctOpponent] of correctOpp) {
    if (excluded.has(pair) || excluded.has(correctOpponent)) continue;

    const actualOpponent = committedOpponentByPair.get(pair);

    // No committed opponent (excluded/not seated) or the draw agrees → skip.
    if (actualOpponent == null) continue;
    if (excluded.has(actualOpponent)) continue;
    if (actualOpponent === correctOpponent) continue;

    const actualOpponentVp = currentVpByPair.get(actualOpponent) ?? 0;
    const correctOpponentVp = currentVpByPair.get(correctOpponent) ?? 0;
    const delta = actualOpponentVp - correctOpponentVp;

    if (Math.abs(delta) <= MISMATCH_VP_THRESHOLD) continue;

    candidates.push({
      roundNumber,
      mismatchedPair: pair,
      actualOpponent,
      correctOpponent,
      actualOpponentVp,
      correctOpponentVp,
      direction: delta > 0 ? "HIGHER" : "LOWER",
    });
  }

  // Stable order: by mismatched pair id.
  return candidates.sort((a, b) => a.mismatchedPair - b.mismatchedPair);
}
