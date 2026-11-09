/**
 * E2E fixture seeder (CLI).
 *
 * Provisions a game straight into the data directory in a known, repeatable
 * state — seated, started, part-played, with withdrawals / late arrivals /
 * handovers applied — so a tester can jump straight to the feature under test.
 * All the work is done by {@link seedGame} (src/scripts/e2e-seed/seed-game.ts),
 * which the automated Playwright suite also uses.
 *
 * Manual testing (writes the box's data dirs; see docs/e2e/README.md):
 *
 *   npm run seed:e2e -- --scoring MP --tables 3 --rounds 3 --play partial
 *   npm run seed:e2e -- --scoring TEAMS_IMP_VP --tables 4 --play round1
 *   npm run seed:e2e -- --scoring MP --rounds 3 --play partial --withdraw A1NS@3
 *   npm run seed:e2e -- --scoring MP --rounds 2 --play all --expectedLate A3EW --lateArrive A3EW
 *   npm run seed:e2e -- --scoring MP --prestart --empty A3EW --tokens
 *
 * Automated tests pass `--json` to get the result as one JSON object on stdout.
 *
 * Flags:
 *   --scoring       fixture key (MP, MP_HOWELL, XIMP, TEAMS_*, SWISS_*)
 *   --tables / --rounds / --boards   field size (boards = boards per round)
 *   --play          all | partial | round1 | none   (default partial)
 *   --movement      fixture | recommended   (recommended = the first card the
 *                   setup screen offers for that table count; pairs only)
 *   --specId        library spec id for MP_HOWELL
 *   --eventName     event name (default "E2E <scoring>")
 *   --noLead        don't record opening leads   --handEntry   allow hand entry
 *   scenario flags  --sections --prestart --empty --expectedLate --lateArrive
 *                   --withdraw --handover --treatment (see seed-e2e-scenario.ts)
 *   --tokens        print every seat's player token
 *   --json          print the result as JSON (for automated tests)
 *
 * NB Swiss/Swiss-Teams materialise ONLY round 1 at start; later rounds are drawn
 * live, so `--play all` on those still only fills round 1.
 */

import {
  FIXTURES,
  seedGame,
  type FixtureKey,
  type ScenarioInput,
  type SeedGameOptions,
  type SeedGameResult,
} from "@/scripts/e2e-seed/seed-game";
import type { Play } from "@/scripts/seed-e2e-scenario";

function getFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

const list = (raw: string | undefined): string[] | undefined =>
  raw === undefined
    ? undefined
    : raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

/** Parse the CLI flags into {@link SeedGameOptions} (validation is seedGame's). */
export function parseCliArgs(argv: string[]): SeedGameOptions & { json: boolean } {
  const scoring = (getFlag(argv, "--scoring") ?? "MP") as FixtureKey;
  if (!(scoring in FIXTURES)) {
    throw new Error(
      `Unknown --scoring "${scoring}". One of: ${Object.keys(FIXTURES).join(", ")}`,
    );
  }
  const play = (getFlag(argv, "--play") ?? "partial") as Play;
  if (!["all", "partial", "round1", "none"].includes(play)) {
    throw new Error(`--play must be all | partial | round1 | none`);
  }
  const movement = (getFlag(argv, "--movement") ?? "fixture") as
    | "fixture"
    | "recommended";
  if (movement !== "fixture" && movement !== "recommended") {
    throw new Error(`--movement must be fixture | recommended`);
  }
  const num = (flag: string) => {
    const raw = getFlag(argv, flag);
    return raw === undefined ? undefined : Number(raw);
  };

  const treatment = list(getFlag(argv, "--treatment"));
  const scenario: ScenarioInput = {
    sections: num("--sections"),
    prestart: argv.includes("--prestart"),
    empty: list(getFlag(argv, "--empty")),
    expectedLate: list(getFlag(argv, "--expectedLate")),
    lateArrive: list(getFlag(argv, "--lateArrive")),
    withdraw: list(getFlag(argv, "--withdraw")),
    handover: list(getFlag(argv, "--handover")),
    treatment: treatment
      ? Object.fromEntries(
          treatment.map((entry) => {
            const [seat, value] = entry.split("=");
            return [seat, (value ?? "").toUpperCase() as "AVERAGE" | "REMOVED"];
          }),
        )
      : undefined,
  };

  return {
    scoring,
    tables: num("--tables"),
    rounds: num("--rounds"),
    boardsPerRound: num("--boards"),
    play,
    specId: num("--specId"),
    movement,
    eventName: getFlag(argv, "--eventName"),
    leadCardRequired: argv.includes("--noLead") ? false : undefined,
    handEntry: argv.includes("--handEntry") ? true : undefined,
    scenario,
    tokens: argv.includes("--tokens"),
    json: argv.includes("--json"),
  };
}

function report(r: SeedGameResult, showAllTokens: boolean) {
  const field =
    r.sections.length === 1
      ? `${r.tables} tables, section A, full seating`
      : `${r.tables} tables in each of sections ${r.sections.join(", ")}`;

  console.log("\n✅ E2E fixture ready\n");
  console.log(`   Fixture      : ${r.fixtureLabel}`);
  console.log(`   gameId       : ${r.gameId}`);
  console.log(`   directorToken: ${r.directorToken}`);
  console.log(`   field        : ${field}`);
  console.log(
    r.started
      ? `   boards played: ${r.boardsPlayed}`
      : "   state        : NOT STARTED (seated, ready for the Tables / Movement / Start screens)",
  );

  if (r.notes.length > 0) {
    console.log("\n   Scenario:");
    for (const n of r.notes) console.log(`     • ${n}`);
  }
  if (r.emptySeats.length > 0) {
    console.log(
      `     • ${r.emptySeats.join(", ")}: empty and NOT marked — one unmarked seat becomes the sit-out; with two or more the start is blocked until you mark them "Expected late" or seat a pair.`,
    );
  }
  if (r.expectedLateSeats.length > 0) {
    console.log(
      `     • ${r.expectedLateSeats.join(", ")}: empty and marked "expected late" — seat them from a device (Join Game).`,
    );
  }

  console.log("\n   Plant the director token in the test browser's console:");
  console.log(
    `   localStorage.setItem("director:${r.gameId}", "${r.directorToken}")\n`,
  );

  // Every seat with --tokens; otherwise just the seats a scenario changed.
  const changed = new Set(
    Object.values(r.seats)
      .filter((s) => s.role !== "original")
      .map((s) => s.seat),
  );
  const seatsToShow = Object.values(r.seats).filter(
    (s) => showAllTokens || changed.has(s.seat),
  );
  const retired = Object.entries(r.retiredTokens);
  if (seatsToShow.length > 0 || retired.length > 0) {
    console.log("   Player tokens (plant on a device to play that seat):");
    for (const s of seatsToShow) {
      const note =
        s.role === "late"
          ? " (late arrival)"
          : s.role === "arriving"
            ? " (arriving pair after handover)"
            : "";
      console.log(
        `   ${s.seat}${note}: localStorage.setItem("player:${r.gameId}", '${JSON.stringify({ startingPosition: s.seat, token: s.token })}')`,
      );
    }
    for (const [seat, token] of retired) {
      console.log(
        `   ${seat} (original pair — token retired on purpose; the server should REJECT it): '${JSON.stringify({ startingPosition: seat, token })}'`,
      );
    }
    console.log("");
  }

  console.log(
    r.started
      ? "   Then open Manage Games → the E2E event on that device.\n"
      : "   Then open Manage Games → the E2E event → Set Up Game on that device.\n",
  );
}

async function main() {
  const { json, ...options } = parseCliArgs(process.argv.slice(2));
  const result = await seedGame(options);
  if (json) {
    // One line of JSON, nothing else, so a test can parse stdout directly.
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    report(result, options.tokens ?? false);
  }
  process.exit(0);
}

if (process.argv[1] && /seed-e2e-fixture\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(
      `\n❌ Failed to seed E2E fixture: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  });
}
