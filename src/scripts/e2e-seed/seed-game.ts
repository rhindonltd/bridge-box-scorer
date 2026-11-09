/**
 * Seed a game straight into the data directory in a known, repeatable state.
 *
 * Shared by the manual-test CLI (`seed-e2e-fixture.ts`, `npm run seed:e2e`) and
 * the automated Playwright suite (which spawns that CLI with `--json`). It calls
 * the same server-side building blocks the app uses — create game, select
 * movement, seat pairs, start → materialise, confirm board results, and the
 * withdraw / late-arrival / handover actions — so a seeded game is
 * indistinguishable from one set up by hand.
 *
 * The data directory comes from `DATABASE_URL` / `DATABASE_GAMES_URL`, exactly
 * as for the server.
 */

import { randomUUID } from "node:crypto";

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { setSelectedMovement } from "@/db/game-index/actions/set-selected-movement";
import { createPairWithPlayers } from "@/db/games/actions/create-pair-with-players";
import { startGame } from "@/services/start-game-service";
import { confirmBoardResult } from "@/db/games/actions/set-board-result";
import { createSection } from "@/db/games/actions/create-section";
import { recordLateArrival } from "@/db/games/actions/record-late-arrival";
import { recordWithdrawal } from "@/db/games/actions/record-withdrawal";
import { handoverSeat } from "@/db/games/actions/handover-seat";
import { setAbsenceTreatment } from "@/db/games/actions/set-absence-treatment";
import { addExpectedLateSeat } from "@/db/games/queries/expected-late-seats";
import { findParticipantSecret } from "@/db/games/queries/find-participant-secret";
import { getPairMovementSpecsForTables } from "@/db/movements/queries";
import { recommendationsFromSpecMap } from "@/movement/recommendations/spec-map-recommendations";
import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { and, eq, isNotNull, max, or } from "drizzle-orm";
import {
  parseScenarioArgs,
  seatsFor,
  sectionLetters,
  type ScenarioArgs,
  type Play,
} from "@/scripts/seed-e2e-scenario";
import type { SelectedMovement } from "@/model/selected-movement";
import type { GameType } from "@/db/games/types/game-type";
import type { EventFormat } from "@/db/games/types/event-format";
import type { ScoringType } from "@/db/games/types/scoring-type";
import type { BoardOutcome } from "@/model/score";
import type { PairSeat } from "@/model/participants";

/** The named fixtures (`--scoring`). */
export type FixtureKey =
  | "MP"
  | "MP_HOWELL"
  | "XIMP"
  | "TEAMS_IMP_VP"
  | "TEAMS_IMP_AGG"
  | "TEAMS_BAM"
  | "TEAMS_PAB"
  | "SWISS_PAIRS_MP"
  | "SWISS_PAIRS_XIMP"
  | "SWISS_TEAMS";

interface FixtureSpec {
  gameType: GameType;
  eventFormat: EventFormat;
  scoringType: ScoringType;
  /** Build the stored movement selection from the resolved sizes. */
  movement: (sizes: {
    tables: number;
    rounds: number;
    bpr: number;
  }) => SelectedMovement;
  /** Human description printed in the summary. */
  label: string;
}

export const FIXTURES: Record<FixtureKey, FixtureSpec> = {
  MP: {
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "MP",
    label: "Pairs · Matchpoints · standard two-winner Mitchell",
    movement: ({ tables, rounds, bpr }) => ({
      source: "MITCHELL",
      mitchell: { tables, rounds, boardsPerRound: bpr },
    }),
  },
  MP_HOWELL: {
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "MP",
    label: "Pairs · Matchpoints · Howell (one-winner, movement library)",
    // SPEC movements come from the seeded movements DB; specId 1 is a library
    // movement. If your box seeds Howell under a different id, pass --specId.
    movement: ({ bpr }) => ({ source: "SPEC", specId: 1, boardsPerRound: bpr }),
  },
  XIMP: {
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "XIMP",
    label: "Pairs · Cross-IMPs · standard Mitchell",
    movement: ({ tables, rounds, bpr }) => ({
      source: "MITCHELL",
      mitchell: { tables, rounds, boardsPerRound: bpr },
    }),
  },
  TEAMS_IMP_VP: {
    gameType: "TEAMS",
    eventFormat: "STANDARD",
    scoringType: "IMP_VP",
    label: "Teams · IMP (Victory Points) · Round Robin",
    movement: ({ tables, rounds, bpr }) => ({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: tables, rounds, boardsPerRound: bpr },
    }),
  },
  TEAMS_IMP_AGG: {
    gameType: "TEAMS",
    eventFormat: "STANDARD",
    scoringType: "IMP",
    label: "Teams · IMP (aggregate net IMPs) · Round Robin",
    movement: ({ tables, rounds, bpr }) => ({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: tables, rounds, boardsPerRound: bpr },
    }),
  },
  TEAMS_BAM: {
    gameType: "TEAMS",
    eventFormat: "STANDARD",
    scoringType: "BAM",
    label: "Teams · Board-a-Match · Round Robin",
    movement: ({ tables, rounds, bpr }) => ({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: tables, rounds, boardsPerRound: bpr },
    }),
  },
  TEAMS_PAB: {
    gameType: "TEAMS",
    eventFormat: "STANDARD",
    scoringType: "PAB",
    label: "Teams · Point-a-Board · Round Robin",
    movement: ({ tables, rounds, bpr }) => ({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: tables, rounds, boardsPerRound: bpr },
    }),
  },
  SWISS_PAIRS_MP: {
    gameType: "PAIRS",
    eventFormat: "SWISS",
    scoringType: "MP",
    label: "Swiss Pairs · Matchpoint→VP (round 1 only; draw the rest live)",
    movement: ({ tables, rounds, bpr }) => ({
      source: "SWISS",
      swiss: { tables, rounds, boardsPerRound: bpr },
    }),
  },
  SWISS_PAIRS_XIMP: {
    gameType: "PAIRS",
    eventFormat: "SWISS",
    scoringType: "XIMP",
    label: "Swiss Pairs · Cross-IMP→VP (round 1 only; draw the rest live)",
    movement: ({ tables, rounds, bpr }) => ({
      source: "SWISS",
      swiss: { tables, rounds, boardsPerRound: bpr },
    }),
  },
  SWISS_TEAMS: {
    gameType: "TEAMS",
    eventFormat: "SWISS",
    scoringType: "IMP_VP",
    label: "Swiss Teams · IMP (VP) (round 1 only; draw the rest live)",
    movement: ({ tables, rounds, bpr }) => ({
      source: "SWISS_TEAMS",
      swissTeams: { teams: tables, rounds, boardsPerRound: bpr },
    }),
  },
};

/** The scenario steps, in typed form (see seed-e2e-scenario.ts for the rules). */
export interface ScenarioInput {
  sections?: number;
  prestart?: boolean;
  empty?: string[];
  expectedLate?: string[];
  lateArrive?: string[];
  /** Seat, optionally with the round: "A1NS" or "A1NS@3". */
  withdraw?: string[];
  handover?: string[];
  /** e.g. { A1NS: "REMOVED" }. */
  treatment?: Record<string, "AVERAGE" | "REMOVED">;
}

export interface SeedGameOptions {
  scoring?: FixtureKey;
  tables?: number;
  rounds?: number;
  boardsPerRound?: number;
  play?: Play;
  specId?: number;
  /**
   * `"fixture"` (default) uses the fixture's own movement (e.g. a Mitchell for
   * MP). `"recommended"` picks exactly the movement the setup screen offers
   * first for the table count — what a director gets by tapping the first card —
   * so tests built on it match a hand-built game. Pairs (standard) only.
   */
  movement?: "fixture" | "recommended";
  eventName?: string;
  /** The game's "Record Opening Lead" option (app default: true). */
  leadCardRequired?: boolean;
  /** The game's "Allow Hand Entry" option (app default: false). */
  handEntry?: boolean;
  scenario?: ScenarioInput;
  /** Print every seat's token in the CLI report. */
  tokens?: boolean;
}

/** One seat a device can hold, with the token to plant to play it. */
export interface SeededSeat {
  seat: string;
  token: string;
  /** "First Last & First Last". */
  names: string;
  /** Who sits there now. */
  role: "original" | "late" | "arriving";
}

export interface SeedGameResult {
  gameId: string;
  eventName: string;
  directorToken: string;
  fixtureLabel: string;
  gameType: GameType;
  eventFormat: EventFormat;
  scoringType: ScoringType;
  tables: number;
  rounds: number;
  boardsPerRound: number;
  sections: string[];
  movement: SelectedMovement;
  started: boolean;
  boardsPlayed: number;
  /** Seats a device can play, keyed by seat (excludes withdrawn / empty). */
  seats: Record<string, SeededSeat>;
  /** Tokens deliberately retired (withdrawal / handover): must be rejected. */
  retiredTokens: Record<string, string>;
  withdrawnSeats: string[];
  /** Seats left empty and unmarked (pre-start only). */
  emptySeats: string[];
  /** Seats still empty and marked expected late. */
  expectedLateSeats: string[];
  notes: string[];
}

/** Two memorable player names for a seat, so the seating is easy to recognise. */
export function playersFor(
  seat: string,
  prefix = "P",
): {
  player1: { firstName: string; lastName: string };
  player2: { firstName: string; lastName: string };
} {
  return {
    player1: { firstName: `${prefix}${seat}`, lastName: "North" },
    player2: { firstName: `${prefix}${seat}`, lastName: "South" },
  };
}

const namesOf = (p: ReturnType<typeof playersFor>) =>
  `${p.player1.firstName} ${p.player1.lastName} & ${p.player2.firstName} ${p.player2.lastName}`;

/** Turn the typed scenario into the CLI flags the shared parser validates. */
export function scenarioToArgv(scenario: ScenarioInput = {}): string[] {
  const argv: string[] = [];
  const list = (flag: string, seats?: string[]) => {
    if (seats && seats.length > 0) argv.push(flag, seats.join(","));
  };
  if (scenario.sections !== undefined) {
    argv.push("--sections", String(scenario.sections));
  }
  if (scenario.prestart) argv.push("--prestart");
  list("--empty", scenario.empty);
  list("--expectedLate", scenario.expectedLate);
  list("--lateArrive", scenario.lateArrive);
  list("--withdraw", scenario.withdraw);
  list("--handover", scenario.handover);
  const treatments = Object.entries(scenario.treatment ?? {}).map(
    ([seat, t]) => `${seat}=${t}`,
  );
  list("--treatment", treatments);
  return argv;
}

/**
 * Resolve the movement for this game: the fixture's own, or — with
 * `movement: "recommended"` — the first recommendation the setup screen offers
 * for the table count. Returns the selection plus its rounds / boards-per-round.
 */
async function resolveMovement(
  fixture: FixtureSpec,
  opts: { tables: number; rounds: number; bpr: number; specId?: number },
  mode: "fixture" | "recommended",
): Promise<{ movement: SelectedMovement; rounds: number; bpr: number }> {
  if (mode === "recommended") {
    if (fixture.gameType !== "PAIRS" || fixture.eventFormat !== "STANDARD") {
      throw new Error(
        `movement: "recommended" is only for standard pairs fixtures (MP / XIMP).`,
      );
    }
    const specs = await getPairMovementSpecsForTables(opts.tables);
    const [first] = recommendationsFromSpecMap(opts.tables, specs);
    if (!first) {
      throw new Error(`No recommended movement for ${opts.tables} tables.`);
    }
    const movement: SelectedMovement =
      first.specRef.source === "generated"
        ? { source: "MITCHELL", mitchell: first.specRef.spec }
        : {
            source: "SPEC",
            specId: first.specRef.id,
            boardsPerRound: first.boardsPerRound,
          };
    return { movement, rounds: first.rounds, bpr: first.boardsPerRound };
  }

  let movement = fixture.movement({
    tables: opts.tables,
    rounds: opts.rounds,
    bpr: opts.bpr,
  });
  if (opts.specId && movement.source === "SPEC") {
    movement = { ...movement, specId: opts.specId };
  }
  return { movement, rounds: opts.rounds, bpr: opts.bpr };
}

/** Throws a readable error for the two table-count parity rules. */
function checkParity(
  scoring: FixtureKey,
  fixture: FixtureSpec,
  tables: number,
  mode: "fixture" | "recommended",
) {
  const mitchellLike = scoring === "MP" || scoring === "XIMP";
  if (mode === "fixture" && mitchellLike && tables % 2 === 0) {
    throw new Error(
      `A standard Mitchell (${scoring}) needs an ODD --tables (try 3 or 5); got ${tables}. ` +
        `For an even field use movement "recommended" (e.g. a Howell).`,
    );
  }
  if (fixture.gameType === "TEAMS" && tables % 2 !== 0) {
    throw new Error(
      `A teams fixture (${scoring}) needs an EVEN --tables (try 4 or 6); got ${tables}.`,
    );
  }
}

/** Create, seat, start, play and apply scenario steps; returns everything a test needs. */
export async function seedGame(
  opts: SeedGameOptions = {},
): Promise<SeedGameResult> {
  const scoring = opts.scoring ?? "MP";
  const fixture = FIXTURES[scoring];
  if (!fixture) {
    throw new Error(
      `Unknown scoring "${scoring}". One of: ${Object.keys(FIXTURES).join(", ")}`,
    );
  }
  const mode = opts.movement ?? "fixture";
  const mitchellLike = scoring === "MP" || scoring === "XIMP";
  const tables = opts.tables ?? (mitchellLike && mode === "fixture" ? 3 : 4);
  const play: Play = opts.play ?? "none";
  checkParity(scoring, fixture, tables, mode);

  const resolved = await resolveMovement(
    fixture,
    {
      tables,
      rounds: opts.rounds ?? 2,
      bpr: opts.boardsPerRound ?? 3,
      specId: opts.specId,
    },
    mode,
  );

  // Validate the scenario before anything is written.
  const scenario: ScenarioArgs = parseScenarioArgs(
    scenarioToArgv(opts.scenario),
    {
      tables,
      rounds: resolved.rounds,
      play,
      boardPooledPairs: mitchellLike,
    },
  );
  const sectionList = sectionLetters(scenario.sections);

  // 1. Create the game-index row + the per-game db (seeds section A).
  const eventName = opts.eventName ?? `E2E ${scoring}`;
  const game = await createBridgeGame({
    eventName,
    director: "E2E Director",
    gameType: fixture.gameType,
    eventFormat: fixture.eventFormat,
    scoringType: fixture.scoringType,
    sectionName: "A",
    eventDate: new Date().toISOString().slice(0, 10),
    tables,
    ...(opts.leadCardRequired !== undefined
      ? { leadCardRequired: opts.leadCardRequired }
      : {}),
    ...(opts.handEntry !== undefined
      ? { handEntryEnabled: opts.handEntry }
      : {}),
  });
  const gameId = game.gameId;
  await createGameDb(gameId, tables);
  for (const section of sectionList.slice(1)) {
    await createSection(gameId, { section, tables });
  }

  // 2. A real DIRECTOR session the HTTP routes and socket guards accept.
  const directorToken = `e2e-${randomUUID()}`;
  await createLoginSession({ token: directorToken, gameId, role: "DIRECTOR" });

  // 3. Select the movement on the game-index row AND every section row (the
  //    leaderboard classifier prefers the former, start reads the latter).
  await setSelectedMovement(gameId, resolved.movement);
  for (const section of sectionList) {
    await setSectionMovement(gameId, section, resolved.movement);
  }

  // 4. Seat the field, except the empty / expected-late seats.
  const lateSeats = new Set<string>(scenario.expectedLate);
  const emptySeats = new Set<string>(scenario.empty);
  const live = new Map<string, SeededSeat>();
  for (const seat of seatsFor(tables, scenario.sections)) {
    if (lateSeats.has(seat) || emptySeats.has(seat)) continue;
    const pair = playersFor(seat);
    const secretKey = randomUUID();
    await createPairWithPlayers(gameId, {
      initialSeat: seat as PairSeat,
      ...pair,
      secretKey,
      teamName:
        fixture.gameType === "TEAMS" && seat.endsWith("NS")
          ? `Team ${seat}`
          : null,
    });
    live.set(seat, { seat, token: secretKey, names: namesOf(pair), role: "original" });
  }
  if (lateSeats.size > 0) {
    const db = await requireGameDb(gameId);
    for (const seat of lateSeats) await addExpectedLateSeat(db, seat as PairSeat);
  }

  // 5–6. Start and play (skipped for a pre-start fixture).
  let boardsPlayed = 0;
  if (!scenario.prestart) {
    const validation = await startGame(gameId);
    if (!validation.canStart) {
      throw new Error(
        `startGame rejected the fixture:\n` +
          validation.problems
            .map((p) => `  - [${p.section ?? "?"}] ${p.message}`)
            .join("\n"),
      );
    }
    boardsPlayed = await confirmBoards(gameId, play, lateSeats);
  }

  // 7. Scenario steps, in the order a real session would hit them.
  const notes: string[] = [];
  const retiredTokens: Record<string, string> = {};

  for (const seat of scenario.lateArrive) {
    const pair = playersFor(seat, "Late");
    const secretKey = randomUUID();
    await createPairWithPlayers(gameId, {
      initialSeat: seat,
      ...pair,
      secretKey,
      teamName: null,
    });
    const result = await recordLateArrival(gameId, seat);
    notes.push(
      result.late
        ? `${seat}: late pair seated — arrived in round ${result.arrivalRound} (status "Late"). Its earlier boards are absent; its round ${result.arrivalRound}+ boards are left for you to play.`
        : `${seat}: pair seated, but not recorded as late (no results beyond round 1).`,
    );
    live.set(seat, { seat, token: secretKey, names: namesOf(pair), role: "late" });
  }

  const withdrawnSeats: string[] = [];
  for (const { seat, fromRound } of scenario.withdraw) {
    const round = fromRound ?? (await nextRoundToPlay(gameId, seat));
    const result = await recordWithdrawal(gameId, seat, round);
    if (!result.ok) throw new Error(`--withdraw ${seat}@${round}: ${result.error}`);
    notes.push(
      `${seat}: withdrawn from round ${round} (${result.absentBoards} board${result.absentBoards === 1 ? "" : "s"} absent). Its old device token is now dead.`,
    );
    const original = live.get(seat);
    if (original) retiredTokens[seat] = original.token;
    live.delete(seat);
    withdrawnSeats.push(seat);
  }

  for (const seat of scenario.handover) {
    const pair = playersFor(seat, "Sub");
    const secretKey = randomUUID();
    const result = await handoverSeat(gameId, {
      seat,
      realPair: pair,
      secretKey,
      teamsGame: fixture.gameType === "TEAMS",
    });
    if (!result.ok) throw new Error(`--handover ${seat}: ${result.error}`);
    notes.push(
      `${seat}: handed over to ${namesOf(pair)} (the "Substituted" row on the Pairs screen).`,
    );
    const original = live.get(seat);
    if (original) retiredTokens[seat] = original.token;
    live.set(seat, { seat, token: secretKey, names: namesOf(pair), role: "arriving" });
  }

  for (const { seat, treatment } of scenario.treatment) {
    const ok = await setAbsenceTreatment(gameId, seat, treatment);
    if (!ok) throw new Error(`--treatment ${seat}: nothing to apply it to.`);
    notes.push(
      `${seat}: missed boards set to ${treatment === "AVERAGE" ? "AVE−/AVE+" : "Remove"}.`,
    );
  }

  // Cross-check every live token against the server's own resolution, so a
  // test never plants a token the server would reject.
  for (const s of live.values()) {
    const secret = await findParticipantSecret(gameId, s.seat);
    if (secret !== s.token) {
      throw new Error(`Seeded token for ${s.seat} does not match the server.`);
    }
  }

  return {
    gameId,
    eventName,
    directorToken,
    fixtureLabel: fixture.label,
    gameType: fixture.gameType,
    eventFormat: fixture.eventFormat,
    scoringType: fixture.scoringType,
    tables,
    rounds: resolved.rounds,
    boardsPerRound: resolved.bpr,
    sections: sectionList,
    movement: resolved.movement,
    started: !scenario.prestart,
    boardsPlayed,
    seats: Object.fromEntries([...live].sort(([a], [b]) => a.localeCompare(b))),
    retiredTokens,
    withdrawnSeats,
    emptySeats: [...emptySeats],
    expectedLateSeats: [...lateSeats].filter(
      (s) => !scenario.lateArrive.includes(s as PairSeat),
    ),
    notes,
  };
}

/** The first round after the latest one with a result in the seat's section. */
async function nextRoundToPlay(gameId: string, seat: string): Promise<number> {
  const db = await requireGameDb(gameId);
  const section = seat.charAt(0);
  const latest = await db
    .select({ round: max(boards.roundNumber) })
    .from(boards)
    .where(
      and(
        eq(boards.section, section),
        or(
          isNotNull(boards.confirmedResult),
          isNotNull(boards.directorOverrideResult),
        ),
      ),
    )
    .get();
  return (latest?.round ?? 0) + 1;
}

/**
 * Confirm materialised playable (NOT_PLAYED) boards per the --play mode, with a
 * mix of results so the leaderboard isn't a flat tie. Returns how many were
 * confirmed. Sit-out / half-average boards are left alone (never player-played),
 * as are boards against a still-empty expected-late seat.
 */
async function confirmBoards(
  gameId: string,
  play: Play,
  emptySeats: Set<string>,
): Promise<number> {
  if (play === "none") return 0;

  const db = await requireGameDb(gameId);
  const rows = await db
    .select({
      section: boards.section,
      roundNumber: boards.roundNumber,
      tableNumber: boards.tableNumber,
      boardNumber: boards.boardNumber,
      ns: boards.ns,
      ew: boards.ew,
    })
    .from(boards)
    .where(eq(boards.status, "NOT_PLAYED"));

  // A small spread of outcomes so pairs/teams don't all tie on every board.
  const RESULTS = [
    "3NTN=",
    "4SN+1",
    "4HS=",
    "3NTN-1",
    "2SE=",
  ] as unknown as BoardOutcome[];

  const maxRound = rows.reduce((m, r) => Math.max(m, r.roundNumber), 0);
  const half = Math.ceil(maxRound / 2);

  let n = 0;
  for (const r of rows) {
    if (play === "round1" && r.roundNumber !== 1) continue;
    if (play === "partial" && r.roundNumber > half) continue;
    // Nobody sits an expected-late seat yet, so these boards can't be played.
    if (emptySeats.has(r.ns) || emptySeats.has(r.ew)) continue;

    await confirmBoardResult(
      db,
      {
        section: r.section,
        roundNumber: r.roundNumber,
        tableNumber: r.tableNumber,
        boardNumber: r.boardNumber,
      },
      RESULTS[(r.tableNumber + r.boardNumber) % RESULTS.length],
    );
    n++;
  }
  return n;
}
