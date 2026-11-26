/**
 * Rulings: every rewrite of results that happens before scoring — who a board
 * is credited to, which results the director has changed, and who is left out
 * of the ranking — plus who holds a seat after a §2.4.7 handover (the
 * handover rules and the ranked / device / merged-line occupant picks).
 * Pure and browser-safe; depends only on the kernel (`@/model`). See
 * docs/design/modules.md §8.
 */

export {
  applyRulings,
  appliesPairsAbsences,
  type DirectorDecisions,
  type RulingsInput,
} from "./apply-rulings";
export type { RuledEvent, RuledInstance } from "@/model/ruled-event";

export { ruledBoardInstances, type TravellerRow } from "./board-instances";

export { applySeatSwap, applySeatSwaps, type SeatSwappable } from "./seat-swap";
export {
  resolveAbsentRow,
  isAbsentRow,
  type AbsenceBoardRow,
  type AbsentRowResolution,
} from "./absence";
export { applyAbsences, pairsStandingsForRanking } from "./apply-absences";
export {
  participantStandings,
  resolveStandings,
  type StandingBoardRow,
} from "./standings";
export {
  arrivalAnchorOf,
  buildOccupantScoredIdResolver,
  inheritStandInOccupancyIds,
  mergedLineOf,
  occupancyCoversBoard,
  oneLineSecondaryByAnchorId,
  primaryOccupancyIds,
  rankedOf,
  scoredIdByOccupancyId,
  seatIsOneLine,
  splitSeatSecondaryOccupants,
  type OccupantCandidate,
  type RankedCandidate,
} from "./occupants";
export {
  chooseHandover,
  isSamePair,
  MAX_PAIRS_PER_TEAM,
  newPairBoards,
  returningPairBoards,
  teamHandoverRejection,
  type HandoverChoice,
  type HandoverOccupant,
  type HandoverRejection,
  type PairIdentity,
  type PlayerIdentity,
  type SeatBoards,
} from "./handover";
