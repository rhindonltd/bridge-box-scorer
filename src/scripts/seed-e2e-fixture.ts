/**
 * E2E manual-test fixture seeder.
 *
 * Provisions a game straight into the appliance's live databases in a known,
 * repeatable state so a manual tester can jump to a specific feature (a scoring
 * correction, a leaderboard check, a director ruling) WITHOUT playing every
 * board on multiple devices. It prints the `gameId` and a KNOWN director token
 * the tester plants in their browser (see docs/e2e/README.md → "Fixture setup").
 *
 * It calls the same server-side building blocks the app uses (create game,
 * select movement, seat pairs, start → materialise, confirm board results), so
 * the resulting game is indistinguishable from one played by hand.
 *
 * Run it the same way as the other maintenance scripts (the `server-only` shim
 * + the appliance's own env, so it writes the real data dirs):
 *
 *   npm run seed:e2e -- --scoring MP --tables 2 --rounds 2 --play all
 *   npm run seed:e2e -- --scoring XIMP --play partial
 *   npm run seed:e2e -- --scoring TEAMS_IMP_VP --tables 4 --play round1
 *   npm run seed:e2e -- --scoring SWISS_PAIRS_MP --tables 4 --rounds 5 --play round1
 *
 * `--play`:
 *   all      every board of every materialised round gets a confirmed result
 *   partial  about half the boards (good for "finish the game / correct a gap")
 *   round1   only round 1's boards (the natural state for a Swiss draw test)
 *   none     nothing confirmed (seated + started, ready for live play)
 *
 * NB Swiss/Swiss-Teams materialise ONLY round 1 at start; later rounds are drawn
 * live, so `--play all` on those still only fills round 1.
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
import { requireGameDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { eq } from "drizzle-orm";
import type { SelectedMovement } from "@/model/selected-movement";
import type { GameType } from "@/db/games/types/game-type";
import type { EventFormat } from "@/db/games/types/event-format";
import type { ScoringType } from "@/db/games/types/scoring-type";
import type { BoardOutcome } from "@/model/score";
import type { PairSeat } from "@/model/participants";

/** The named fixtures the tester can pick with `--scoring`. */
type FixtureKey =
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
  movement: (sizes: { tables: number; rounds: number; bpr: number }) => SelectedMovement;
  /** Human description printed in the summary. */
  label: string;
}

const FIXTURES: Record<FixtureKey, FixtureSpec> = {
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

interface Args {
  scoring: FixtureKey;
  tables: number;
  rounds: number;
  bpr: number;
  play: "all" | "partial" | "round1" | "none";
  specId?: number;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const scoring = (get("--scoring") ?? "MP") as FixtureKey;
  if (!(scoring in FIXTURES)) {
    throw new Error(
      `Unknown --scoring "${scoring}". One of: ${Object.keys(FIXTURES).join(", ")}`,
    );
  }

  const play = (get("--play") ?? "partial") as Args["play"];
  if (!["all", "partial", "round1", "none"].includes(play)) {
    throw new Error(`--play must be all | partial | round1 | none`);
  }

  const specIdRaw = get("--specId");

  // A standard Mitchell needs an ODD table count (the NS/EW rotation); teams
  // and Swiss movements want an EVEN field (full teams / even pairs). Pick a
  // sensible default per fixture so a no-flags run always starts cleanly.
  const mitchellLike = scoring === "MP" || scoring === "XIMP";
  const defaultTables = mitchellLike ? 3 : 4;

  return {
    scoring,
    tables: Number(get("--tables") ?? defaultTables),
    rounds: Number(get("--rounds") ?? 2),
    bpr: Number(get("--boards") ?? 3),
    play,
    specId: specIdRaw ? Number(specIdRaw) : undefined,
  };
}

/** Two memorable player names for a seat, so the seating is easy to recognise. */
function playersFor(seat: PairSeat): {
  player1: { firstName: string; lastName: string };
  player2: { firstName: string; lastName: string };
} {
  return {
    player1: { firstName: `P${seat}`, lastName: "North" },
    player2: { firstName: `P${seat}`, lastName: "South" },
  };
}

/**
 * Every seat a round-1 full field needs: both directions at every table,
 * section A. (An even, fully-seated field — no sit-out — so start always
 * validates for pairs, teams and swiss alike.)
 */
function seatsFor(tables: number): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`A${t}NS` as PairSeat, `A${t}EW` as PairSeat);
  }
  return seats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = FIXTURES[args.scoring];
  const sizes = { tables: args.tables, rounds: args.rounds, bpr: args.bpr };

  // Guard the two parity rules up front with a readable message (otherwise the
  // movement generator throws a deep stack at start time).
  const mitchellLike = args.scoring === "MP" || args.scoring === "XIMP";
  if (mitchellLike && args.tables % 2 === 0) {
    throw new Error(
      `A standard Mitchell (${args.scoring}) needs an ODD --tables (try 3 or 5); got ${args.tables}.`,
    );
  }
  if (fixture.gameType === "TEAMS" && args.tables % 2 !== 0) {
    throw new Error(
      `A teams fixture (${args.scoring}) needs an EVEN --tables (try 4 or 6); got ${args.tables}.`,
    );
  }

  // 1. Create the game-index row + the per-game db (seeds section A).
  const game = await createBridgeGame({
    eventName: `E2E ${args.scoring}`,
    director: "E2E Director",
    gameType: fixture.gameType,
    eventFormat: fixture.eventFormat,
    scoringType: fixture.scoringType,
    sectionName: "A",
    eventDate: new Date().toISOString().slice(0, 10),
    tables: args.tables,
  });
  const gameId = game.gameId;
  await createGameDb(gameId, args.tables);

  // 2. Mint a KNOWN director token (so the tester can plant it without reading
  //    it back out of the create response). It is a real system.db session, so
  //    both the HTTP routes and the socket guards accept it.
  const directorToken = `e2e-${randomUUID()}`;
  await createLoginSession({ token: directorToken, gameId, role: "DIRECTOR" });

  // 3. Select the movement (allow a --specId override for the SPEC fixture).
  let movement = fixture.movement(sizes);
  if (args.specId && movement.source === "SPEC") {
    movement = { ...movement, specId: args.specId };
  }
  // Persist on BOTH the game-index row and the section row: the leaderboard
  // classifier prefers the game-index copy, while start reads the section copy.
  await setSelectedMovement(gameId, movement);
  await setSectionMovement(gameId, "A", movement);

  // 4. Seat a full field, section A.
  for (const seat of seatsFor(args.tables)) {
    const { player1, player2 } = playersFor(seat);
    await createPairWithPlayers(gameId, {
      initialSeat: seat,
      player1,
      player2,
      secretKey: randomUUID(),
      // Give teams a readable name on the home (NS) seat.
      teamName:
        fixture.gameType === "TEAMS" && seat.endsWith("NS")
          ? `Team ${seat}`
          : null,
    });
  }

  // 5. Start → materialise round 1 (static movements materialise everything).
  const validation = await startGame(gameId);
  if (!validation.canStart) {
    throw new Error(
      `startGame rejected the fixture:\n` +
        validation.problems
          .map((p) => `  - [${p.section ?? "?"}] ${p.message}`)
          .join("\n"),
    );
  }

  // 6. Confirm board results per --play. We confirm whole boards (both sides
  //    agree) directly, the same end state the dual-side player flow reaches.
  const confirmed = await confirmBoards(gameId, args.play);

  // 7. Report.
  console.log("\n✅ E2E fixture ready\n");
  console.log(`   Fixture      : ${fixture.label}`);
  console.log(`   gameId       : ${gameId}`);
  console.log(`   directorToken: ${directorToken}`);
  console.log(`   field        : ${args.tables} tables, section A, full seating`);
  console.log(`   boards played: ${confirmed} (--play ${args.play})`);
  console.log("\n   Plant the director token in the test browser's console:");
  console.log(
    `   localStorage.setItem("director:${gameId}", "${directorToken}")\n`,
  );
  console.log(
    "   Then open Manage Games → the E2E event on that device.\n",
  );
  process.exit(0);
}

/**
 * Confirm materialised playable (NOT_PLAYED) boards per the --play mode, with a
 * mix of results so the leaderboard isn't a flat tie. Returns how many were
 * confirmed. Sit-out / half-average boards are left alone (never player-played).
 */
async function confirmBoards(
  gameId: string,
  play: Args["play"],
): Promise<number> {
  if (play === "none") return 0;

  const db = await requireGameDb(gameId);
  const rows = await db
    .select({
      section: boards.section,
      roundNumber: boards.roundNumber,
      tableNumber: boards.tableNumber,
      boardNumber: boards.boardNumber,
      status: boards.status,
    })
    .from(boards)
    .where(eq(boards.status, "NOT_PLAYED"));

  // A small spread of outcomes so pairs/teams don't all tie on every board.
  const RESULTS: BoardOutcome[] = [
    "3NTN=" as BoardOutcome,
    "4SN+1" as BoardOutcome,
    "4HS=" as BoardOutcome,
    "3NTN-1" as BoardOutcome,
    "2SE=" as BoardOutcome,
  ];

  const maxRound = rows.reduce((m, r) => Math.max(m, r.roundNumber), 0);
  const half = Math.ceil(maxRound / 2);

  let n = 0;
  for (const r of rows) {
    if (play === "round1" && r.roundNumber !== 1) continue;
    if (play === "partial" && r.roundNumber > half) continue;

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

main().catch((err) => {
  console.error("\n❌ Failed to seed E2E fixture:", err);
  process.exit(1);
});
