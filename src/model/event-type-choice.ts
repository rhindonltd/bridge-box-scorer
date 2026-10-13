import { GameType } from "@/db/games/types/game-type";
import { EventFormat } from "@/db/games/types/event-format";
import { ScoringType } from "@/db/games/types/scoring-type";

/**
 * The four event types a director picks on the create form. Each is a
 * (game-type family × format) pair under the hood: the "Swiss" choices are the
 * same pairs/teams family in the SWISS format, which only changes how the
 * movement is set up (drawn round by round) — not how it is scored.
 *
 * Shared so both the create form and the post-creation "Edit Event Details"
 * screen render the same options and use one source of truth for mapping to and
 * from the stored game fields.
 */
export type EventTypeChoice = "PAIRS" | "TEAMS" | "SWISS_PAIRS" | "SWISS_TEAMS";

/** The (gameType × eventFormat) pair each event-type choice maps to. */
export const EVENT_TYPE_MAP: Record<
  EventTypeChoice,
  { gameType: GameType; eventFormat: EventFormat }
> = {
  PAIRS: { gameType: "PAIRS", eventFormat: "STANDARD" },
  TEAMS: { gameType: "TEAMS", eventFormat: "STANDARD" },
  SWISS_PAIRS: { gameType: "PAIRS", eventFormat: "SWISS" },
  SWISS_TEAMS: { gameType: "TEAMS", eventFormat: "SWISS" },
};

/** The event-type options shown in the dropdown, in display order. */
export const EVENT_TYPE_OPTIONS: { label: string; value: EventTypeChoice }[] = [
  { label: "Pairs", value: "PAIRS" },
  { label: "Teams", value: "TEAMS" },
  { label: "Swiss Pairs", value: "SWISS_PAIRS" },
  { label: "Swiss Teams", value: "SWISS_TEAMS" },
];

/** Whether a choice is in the pairs family (vs the teams family). */
export function isPairsChoice(choice: EventTypeChoice): boolean {
  return choice === "PAIRS" || choice === "SWISS_PAIRS";
}

/**
 * Reverse of {@link EVENT_TYPE_MAP}: resolve the event-type choice a stored
 * game's `gameType` + `eventFormat` represent, so a screen can prefill the
 * dropdown from the persisted game. Defaults to the STANDARD form of the game
 * type for any unrecognised format.
 */
export function eventTypeChoiceOf(
  gameType: GameType,
  eventFormat: EventFormat,
): EventTypeChoice {
  if (gameType === "TEAMS") {
    return eventFormat === "SWISS" ? "SWISS_TEAMS" : "TEAMS";
  }
  return eventFormat === "SWISS" ? "SWISS_PAIRS" : "PAIRS";
}

/**
 * The scoring type a given event-type choice + the two scoring selections
 * resolve to, mirroring the create form's submit logic:
 *  - Swiss Teams is always IMP (Victory Points) — the only scoring that powers
 *    the VP-based draw.
 *  - Pairs / Swiss Pairs use the pairs scoring choice (MP / XIMP).
 *  - Teams use the teams scoring choice (IMP / IMP_VP / BAM / PAB).
 */
export function scoringTypeFor(
  choice: EventTypeChoice,
  pairsScoring: Extract<ScoringType, "MP" | "XIMP">,
  teamsScoring: Extract<ScoringType, "IMP" | "IMP_VP" | "BAM" | "PAB">,
): ScoringType {
  if (choice === "SWISS_TEAMS") return "IMP_VP";
  return isPairsChoice(choice) ? pairsScoring : teamsScoring;
}

/** The pairs scoring choices (MP / XIMP) a stored type splits back into. */
export type PairsScoring = Extract<ScoringType, "MP" | "XIMP">;
/** The teams scoring choices a stored type splits back into. */
export type TeamsScoring = Extract<ScoringType, "IMP" | "IMP_VP" | "BAM" | "PAB">;

/**
 * Split a stored `scoringType` back into the pairs and teams scoring selections
 * a form holds separately, so prefilling preserves the right dropdown value for
 * the current family while keeping a sensible default for the other. The stored
 * type belongs to one family; the other family's selection falls back to its
 * create-form default (MP for pairs, IMP for teams).
 */
export function splitScoring(scoringType: ScoringType): {
  pairsScoring: PairsScoring;
  teamsScoring: TeamsScoring;
} {
  const pairsScoring: PairsScoring = scoringType === "XIMP" ? "XIMP" : "MP";
  const teamsScoring: TeamsScoring =
    scoringType === "IMP_VP" ||
    scoringType === "BAM" ||
    scoringType === "PAB" ||
    scoringType === "IMP"
      ? scoringType
      : "IMP";
  return { pairsScoring, teamsScoring };
}
