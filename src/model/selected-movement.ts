import { z } from "zod";

/**
 * The movement a director has chosen for a game, persisted on the game-index
 * `games` row as opaque JSON text and only materialized into boards/assignments
 * when the game is started.
 *
 * Variants:
 * - SPEC: a hard-coded movement from the movements database, keyed by numeric id
 *   plus the boards-per-round chosen for it (the stored spec keeps only board-set
 *   indices, so board numbers are computed at materialize time).
 * - MITCHELL: a generated Mitchell movement, described by its spec so it can be
 *   regenerated at start time.
 * - SWISS: a Swiss Pairs movement. Unlike the other two, its schedule is NOT
 *   known up front: only round 1 (a purely positional pairing) is materialized
 *   at start, and each later round is drawn live by the director from current
 *   standings. The selection therefore carries only the setup parameters
 *   (tables, total rounds, boards-per-round); no per-round layout is stored.
 * - SWISS_TEAMS: a Swiss Teams movement. A team is the two pairs seated at one
 *   home table. Like SWISS, its schedule is drawn live: round 1 is a random
 *   team pairing and later rounds are drawn from standings. Each team's NS pair
 *   stays at its home table while its other pair moves to the opponent's home
 *   table (open/closed room), so a match spans two tables playing the same
 *   boards. The selection carries only the setup parameters (team count, total
 *   rounds, boards-per-round); no per-round layout is stored. The team count
 *   must be even (three-way "triple" handling is not yet supported).
 * - ROUND_ROBIN_TEAMS: a Teams Round Robin movement. Like SWISS_TEAMS a team is
 *   the two pairs at one home table and matches use the same open/closed-room
 *   layout, but the schedule is fixed and fully known up front (every team
 *   plays every other exactly once), so the WHOLE schedule is materialized at
 *   start rather than drawn live. The selection still stores only the setup
 *   parameters (team count, total rounds, boards-per-round); the schedule is
 *   regenerated deterministically from them. The team count must be even.
 */

export const mitchellSpecSchema = z.object({
  tables: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
  arrowSwitchRounds: z.number().int().nonnegative().optional(),
  // Mutually-exclusive Mitchell variant flags; at most one should be set. When
  // none is set a Standard Mitchell is regenerated at rehydration.
  skip: z.boolean().optional(),
  shareAndRelay: z.boolean().optional(),
  hesitation: z.boolean().optional(),
  web: z.boolean().optional(),
  americanWhist: z.boolean().optional(),
});

/**
 * How an odd Swiss Pairs field is resolved each round:
 * - "BYE" (the default): one pair sits the whole round out, credited an
 *   average-plus result.
 * - "HALF_MATCHES": three pairs play "2 half matches" — one anchor pair plays
 *   the full round against a different opponent in each half, and the other two
 *   each play one half (and are compensated for the half they miss). See
 *   `docs/swiss-pairs-half-matches-design.md`.
 *
 * Only meaningful when the pair count is odd. There is no "long" variant for
 * pairs (it would be equivalent to two byes).
 */
export const swissPairsOddHandlingSchema = z.enum(["BYE", "HALF_MATCHES"]);

/** How a single Swiss Pairs round resolves the odd pair. */
export const swissPairsOddRoundSchema = z.enum(["BYE", "HALF_MATCHES"]);

/**
 * Setup parameters for a Swiss Pairs movement. There is no per-round layout:
 * round 1 is positional and later rounds are drawn from standings, so all a
 * Swiss selection needs is the table count, the number of rounds to play, and
 * the boards played per round (which also fixes each round's board range).
 */
export const swissSpecSchema = z
  .object({
    tables: z.number().int().positive(),
    rounds: z.number().int().positive(),
    boardsPerRound: z.number().int().positive(),
    /**
     * Stable ids of pairs the director has marked as stationary: they keep their
     * round-1 table and direction for the whole event, and each round's drawn
     * opponent comes to them. Pair ids are the Swiss stable numbering — 1..tables
     * are the pairs that start North/South, tables+1..2*tables the pairs that
     * start East/West. Optional and defaults to none.
     */
    stationaryPairs: z.array(z.number().int().positive()).optional(),
    /**
     * How an odd pair count is resolved. Defaults to "BYE". Only meaningful when
     * there is an odd number of pairs (i.e. one empty seat in the field).
     */
    oddHandling: swissPairsOddHandlingSchema.optional(),
    /**
     * The per-round odd-field plan, one entry per round, set at setup. Only used
     * (and only required) when `oddHandling === "HALF_MATCHES"`, in which case
     * its length must equal `rounds`. Each entry says whether that round resolves
     * the odd pair with a bye or a 2-half-matches group. (For "BYE" or an even
     * field it is omitted.)
     */
    oddRoundPlan: z.array(swissPairsOddRoundSchema).optional(),
  })
  .superRefine((spec, ctx) => {
    // The per-round plan is only meaningful under HALF_MATCHES, and must then
    // cover exactly the declared rounds.
    if (spec.oddHandling === "HALF_MATCHES") {
      if (!spec.oddRoundPlan || spec.oddRoundPlan.length !== spec.rounds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "oddRoundPlan must have exactly one entry per round when oddHandling is HALF_MATCHES",
          path: ["oddRoundPlan"],
        });
      }
    } else if (spec.oddRoundPlan !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "oddRoundPlan is only valid when oddHandling is HALF_MATCHES",
        path: ["oddRoundPlan"],
      });
    }
  });

export type SwissMovementSpec = z.infer<typeof swissSpecSchema>;

/** How an odd Swiss Pairs field is resolved (`oddHandling`); default "BYE". */
export type SwissPairsOddHandling = z.infer<typeof swissPairsOddHandlingSchema>;

/** One round's odd-pair resolution in a Swiss Pairs plan. */
export type SwissPairsOddRound = z.infer<typeof swissPairsOddRoundSchema>;

/**
 * Setup parameters for a Swiss Teams movement. A team is the two pairs seated
 * at one home table, so `teams` equals the table count. Like Swiss Pairs there
 * is no per-round layout: round 1 is a random draw and later rounds are drawn
 * from standings, so all that is stored is the team count, the number of rounds
 * to play, and the boards played per round (which fixes each round's board
 * range).
 *
 * An odd team count is handled per `oddHandling`: "BYE" (the default) sits one
 * team out each round (the bottom table in round 1, then the lowest-ranked team
 * without a prior bye); "TRIPLE" resolves the odd team with a three-way per the
 * per-round `oddRoundPlan` (a bye, a short triple, or part of a long triple).
 * An even count ignores both. See `docs/swiss-teams-triples-design.md`.
 */
export const swissTeamsOddHandlingSchema = z.enum(["BYE", "TRIPLE"]);

/**
 * How a single Swiss Teams round resolves the odd team, under "TRIPLE":
 * - "BYE": one team sits the round out (average-plus), as under plain "BYE".
 * - "SHORT": a short triple — three teams play a round-robin of three
 *   head-to-head half-matches within the one round.
 * - { kind: "LONG"; group }: part of a long triple — the three teams play the
 *   same round-robin over FULL boards, spread across two consecutive rounds. A
 *   long triple's two rounds share the same `group` id so its halves are
 *   unambiguously linked (even when two long triples sit back to back).
 */
export const swissTeamsOddRoundSchema = z.union([
  z.literal("BYE"),
  z.literal("SHORT"),
  z.object({
    kind: z.literal("LONG"),
    group: z.number().int().nonnegative(),
  }),
]);

export const swissTeamsSpecSchema = z
  .object({
    teams: z.number().int().positive(),
    rounds: z.number().int().positive(),
    boardsPerRound: z.number().int().positive(),
    /**
     * How an odd team count is resolved. Defaults to "BYE". Only meaningful when
     * `teams` is odd.
     */
    oddHandling: swissTeamsOddHandlingSchema.optional(),
    /**
     * The per-round odd-field plan, one entry per round, set at setup. Only used
     * (and only required) when `oddHandling === "TRIPLE"`, in which case its
     * length must equal `rounds`. Each entry resolves that round's odd team with
     * a bye, a short triple, or (as two adjacent same-`group` LONG entries) a
     * long triple. (For "BYE" or an even field it is omitted.)
     */
    oddRoundPlan: z.array(swissTeamsOddRoundSchema).optional(),
  })
  .superRefine((spec, ctx) => {
    if (spec.oddHandling !== "TRIPLE") {
      if (spec.oddRoundPlan !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "oddRoundPlan is only valid when oddHandling is TRIPLE",
          path: ["oddRoundPlan"],
        });
      }
      return;
    }

    // Under TRIPLE the plan is required and must cover exactly the rounds.
    const plan = spec.oddRoundPlan;
    if (!plan || plan.length !== spec.rounds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "oddRoundPlan must have exactly one entry per round when oddHandling is TRIPLE",
        path: ["oddRoundPlan"],
      });
      return;
    }

    // Each LONG group id must appear in EXACTLY two positions, and those two
    // must be adjacent (rounds R and R+1) — one long triple = two consecutive
    // rounds.
    const longPositions = new Map<number, number[]>();
    plan.forEach((entry, i) => {
      if (typeof entry === "object" && entry.kind === "LONG") {
        const list = longPositions.get(entry.group) ?? [];
        list.push(i);
        longPositions.set(entry.group, list);
      }
    });
    for (const [group, positions] of longPositions) {
      if (positions.length !== 2 || positions[1] !== positions[0] + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LONG group ${group} must occupy exactly two adjacent rounds`,
          path: ["oddRoundPlan"],
        });
      }
    }
  });

export type SwissTeamsMovementSpec = z.infer<typeof swissTeamsSpecSchema>;

/** One round's odd-team resolution in a Swiss Teams plan. */
export type SwissTeamsOddRound = z.infer<typeof swissTeamsOddRoundSchema>;

/** How an odd Swiss Teams field is resolved (`oddHandling`); default "BYE". */
export type SwissTeamsOddHandling = z.infer<typeof swissTeamsOddHandlingSchema>;

/**
 * Setup parameters for a Teams Round Robin movement. As with Swiss Teams a team
 * is the two pairs seated at one home table, so `teams` equals the table count.
 * Unlike Swiss Teams the schedule is fixed and fully known up front (every team
 * plays every other exactly once), but the selection still stores only the
 * setup parameters — the whole schedule is regenerated deterministically at
 * start from the team count, rounds to play, and boards per round (which fixes
 * each round's board range). The team count must be even; odd counts are
 * rejected at start (bye handling is future work).
 */
export const roundRobinTeamsSpecSchema = z.object({
  teams: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
});

export type RoundRobinTeamsMovementSpec = z.infer<
  typeof roundRobinTeamsSpecSchema
>;

export const selectedMovementSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("SPEC"),
    specId: z.number().int().positive(),
    // Boards played per round when this spec is materialized. Required: the
    // stored spec only carries board-set indices, so board numbers cannot be
    // derived without it.
    boardsPerRound: z.number().int().positive(),
  }),
  z.object({
    source: z.literal("MITCHELL"),
    mitchell: mitchellSpecSchema,
  }),
  z.object({
    source: z.literal("SWISS"),
    swiss: swissSpecSchema,
  }),
  z.object({
    source: z.literal("SWISS_TEAMS"),
    swissTeams: swissTeamsSpecSchema,
  }),
  z.object({
    source: z.literal("ROUND_ROBIN_TEAMS"),
    roundRobinTeams: roundRobinTeamsSpecSchema,
  }),
]);

export type SelectedMovement = z.infer<typeof selectedMovementSchema>;

/**
 * Serialize a SelectedMovement to the JSON text stored in the DB column.
 */
export function serializeSelectedMovement(selected: SelectedMovement): string {
  return JSON.stringify(selected);
}

/**
 * The number of rounds a movement is configured to run. For the three movements
 * that carry an explicit `rounds` in their spec (MITCHELL, SWISS, SWISS_TEAMS,
 * ROUND_ROBIN_TEAMS) that value is authoritative. A SPEC (movement-library)
 * selection does not carry a round count in the stored selection — its schedule
 * is defined by the referenced spec and is fully materialized at start — so
 * null is returned and callers fall back to the materialized round count.
 *
 * Used to tell "all drawn rounds are done but more are expected" (Swiss, before
 * the director draws the next round) apart from "the event is genuinely over".
 */
export function expectedRounds(
  selected: SelectedMovement | null,
): number | null {
  if (!selected) return null;
  switch (selected.source) {
    case "MITCHELL":
      return selected.mitchell.rounds;
    case "SWISS":
      return selected.swiss.rounds;
    case "SWISS_TEAMS":
      return selected.swissTeams.rounds;
    case "ROUND_ROBIN_TEAMS":
      return selected.roundRobinTeams.rounds;
    case "SPEC":
      return null;
  }
}

/**
 * The boards-per-round a movement is configured for, or null when unknown. This
 * sizes the EBU §3.3.9 teams void split (AVE+/AVE− over ⌈N/2⌉ boards): without
 * it the void falls back to the flat §3.3.6.1 40%.
 *
 * `boardsPerRound` lives at the TOP level only for a SPEC selection; every
 * other source nests it inside its own spec object, so a plain
 * `"boardsPerRound" in movement` check silently misses the teams movements —
 * exactly where the void split needs it. This reads the right nested field per
 * source.
 */
export function boardsPerRoundOf(
  selected: SelectedMovement | null,
): number | null {
  if (!selected) return null;
  switch (selected.source) {
    case "MITCHELL":
      return selected.mitchell.boardsPerRound;
    case "SWISS":
      return selected.swiss.boardsPerRound;
    case "SWISS_TEAMS":
      return selected.swissTeams.boardsPerRound;
    case "ROUND_ROBIN_TEAMS":
      return selected.roundRobinTeams.boardsPerRound;
    case "SPEC":
      return selected.boardsPerRound;
  }
}

/**
 * Structural equality for two (possibly null) selected movements. Used to
 * decide whether a movement selection actually changed — e.g. so a no-op
 * re-selection doesn't needlessly clear the section's derived timer.
 *
 * Both are null: equal. One null: not equal. SPEC compares id + boards per
 * round; MITCHELL compares the defining spec fields (and normalises the
 * optional variant flags so an absent flag equals an explicit false).
 */
export function selectedMovementsEqual(
  a: SelectedMovement | null,
  b: SelectedMovement | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.source !== b.source) return false;

  // Sources are known-equal here. Switch over the (finite) source union with a
  // case per variant, each returning. TypeScript sees the switch as exhaustive
  // (`a.source` is narrowed to `never` after the last case), so no fallthrough
  // return is needed — there is simply no unreachable line to test. Adding a
  // new source without a case becomes a compile error ("not all code paths
  // return a value").
  switch (a.source) {
    case "SPEC": {
      const y = b as Extract<SelectedMovement, { source: "SPEC" }>;
      return a.specId === y.specId && a.boardsPerRound === y.boardsPerRound;
    }
    case "MITCHELL": {
      const x = a.mitchell;
      const y = (b as Extract<SelectedMovement, { source: "MITCHELL" }>)
        .mitchell;
      return (
        x.tables === y.tables &&
        x.rounds === y.rounds &&
        x.boardsPerRound === y.boardsPerRound &&
        (x.arrowSwitchRounds ?? 0) === (y.arrowSwitchRounds ?? 0) &&
        !!x.skip === !!y.skip &&
        !!x.shareAndRelay === !!y.shareAndRelay &&
        !!x.hesitation === !!y.hesitation &&
        !!x.web === !!y.web &&
        !!x.americanWhist === !!y.americanWhist
      );
    }
    case "SWISS": {
      const x = a.swiss;
      const y = (b as Extract<SelectedMovement, { source: "SWISS" }>).swiss;
      const samePlan =
        JSON.stringify(x.oddRoundPlan ?? null) ===
        JSON.stringify(y.oddRoundPlan ?? null);
      const sameStationary =
        JSON.stringify([...(x.stationaryPairs ?? [])].sort((m, n) => m - n)) ===
        JSON.stringify([...(y.stationaryPairs ?? [])].sort((m, n) => m - n));
      return (
        x.tables === y.tables &&
        x.rounds === y.rounds &&
        x.boardsPerRound === y.boardsPerRound &&
        // Absent oddHandling means the default "BYE".
        (x.oddHandling ?? "BYE") === (y.oddHandling ?? "BYE") &&
        samePlan &&
        sameStationary
      );
    }
    case "SWISS_TEAMS": {
      const y = (b as Extract<SelectedMovement, { source: "SWISS_TEAMS" }>)
        .swissTeams;
      return (
        a.swissTeams.teams === y.teams &&
        a.swissTeams.rounds === y.rounds &&
        a.swissTeams.boardsPerRound === y.boardsPerRound &&
        // Absent oddHandling means the default "BYE".
        (a.swissTeams.oddHandling ?? "BYE") === (y.oddHandling ?? "BYE") &&
        // The per-round triple plan (absent === none); structural JSON compare
        // since entries are a mix of string literals and {kind,group} objects.
        JSON.stringify(a.swissTeams.oddRoundPlan ?? null) ===
          JSON.stringify(y.oddRoundPlan ?? null)
      );
    }
    case "ROUND_ROBIN_TEAMS": {
      const y = (
        b as Extract<SelectedMovement, { source: "ROUND_ROBIN_TEAMS" }>
      ).roundRobinTeams;
      return (
        a.roundRobinTeams.teams === y.teams &&
        a.roundRobinTeams.rounds === y.rounds &&
        a.roundRobinTeams.boardsPerRound === y.boardsPerRound
      );
    }
  }
}

/**
 * Parse the DB column value into a typed SelectedMovement. Returns null for
 * null/empty/invalid input so callers always get a well-typed result and a
 * corrupt/legacy value never throws at the boundary.
 */
export function parseSelectedMovement(
  value: string | null | undefined,
): SelectedMovement | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = selectedMovementSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
