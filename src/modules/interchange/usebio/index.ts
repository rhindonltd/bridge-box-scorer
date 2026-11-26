/**
 * interchange, USEBIO entry (docs/design/modules.md §11).
 *
 * Writes USEBIO 1.2 results files. It lays results out and computes none of
 * them: every score, ranking and Victory Point it writes is passed in by the
 * caller. Server-side only, because the XML library does not load in the
 * browser; the PBN half of the module is the browser-safe main entry.
 */

export {
  generateUsebioXml,
  type UsebioBoardComparisonBoard,
  type UsebioBoardComparisonMatch,
  type UsebioBoardComparisonRankEntry,
  type UsebioBoardComparisonScoring,
  type UsebioBoardComparisonTeamsData,
  type UsebioBoardResult,
  type UsebioClub,
  type UsebioGameData,
  type UsebioPair,
  type UsebioPairPlacing,
  type UsebioPairsData,
  type UsebioPlayer,
  type UsebioSwissBoard,
  type UsebioSwissPairsData,
  type UsebioSwissPairsMatch,
  type UsebioSwissTeamsData,
  type UsebioSwissTeamsMatch,
  type UsebioTeam,
  type UsebioTeamBoard,
  type UsebioTeamPair,
  type UsebioTeamTravellerLine,
  type UsebioVpRankEntry,
} from "./generate-usebio";
export {
  buildTravellerLine,
  totalTricksFor,
  type UsebioTravellerLine,
} from "./traveller-line";
export {
  buildTeamPairing,
  type TeamOccupancy,
  type TeamPairing,
} from "./team-pairing";
