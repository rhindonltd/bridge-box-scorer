/**
 * A game's structural FORMAT, orthogonal to its {@link GameType} (pairs vs
 * teams family). Together they give the four event types a director picks from:
 *
 *   gameType × eventFormat
 *   ----------------------
 *   PAIRS × STANDARD  → Pairs
 *   PAIRS × SWISS     → Swiss Pairs
 *   TEAMS × STANDARD  → Teams
 *   TEAMS × SWISS     → Swiss Teams
 *
 * - STANDARD: a fixed, fully-known movement chosen from the recommendation
 *   list (Mitchell/Howell/American Whist for pairs; Round Robin for teams).
 * - SWISS: a draw-as-you-go movement whose later rounds are seeded from the
 *   current standings (Swiss Pairs / Swiss Teams).
 *
 * The format is the create-time intent. It decides which movement UI the setup
 * flow shows (Swiss setup vs the normal movement picker) and, with the game
 * type and scoring type, is one input to {@link classifyEvent}. It does NOT
 * replace the movement source stored on the selected movement — a SWISS game's
 * selected movement is still a `SWISS` / `SWISS_TEAMS` source — it records the
 * director's choice up front so the setup UI and validation know the intent
 * before a movement has been configured.
 */
export const EventFormats = ["STANDARD", "SWISS"] as const;

export type EventFormat = (typeof EventFormats)[number];
