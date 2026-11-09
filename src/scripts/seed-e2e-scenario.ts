/**
 * Scenario flags for the E2E fixture seeder (`seed-e2e-fixture.ts`).
 *
 * Pure parsing + validation, kept apart from the seeder so the rules (which
 * flag combinations can actually produce the requested state) are unit-tested
 * without touching a database. The seeder applies the result.
 *
 * The flags build on a board-pooled PAIRS fixture (`--scoring MP` or `XIMP`):
 *
 *   --sections N            N sections (A, B, …), each `--tables` tables
 *   --prestart             seat the field but do NOT start the game (setup-screen tests)
 *   --empty A3EW           (with --prestart) leave these seats empty and UNMARKED
 *   --expectedLate A3EW,B1NS  leave these seats EMPTY, marked "expected late"
 *   --lateArrive  A3EW      seat the latecomer after play (must be expected-late)
 *   --withdraw    A1NS@2    withdraw the pair from round 2 (round optional)
 *   --handover    A2NS      hand the seat over to an arriving pair
 *   --treatment   A1NS=REMOVED  AVE (default) or REMOVED for a withdrawn / late /
 *                           still-empty expected-late seat
 *   --tokens                print every seated pair's device token
 */

import type { PairSeat } from "@/model/participants";

export type Play = "all" | "partial" | "round1" | "none";
export type AbsenceTreatmentFlag = "AVERAGE" | "REMOVED";

export interface ScenarioArgs {
  sections: number;
  /** Seat the field but leave the game un-started (for setup-screen tests). */
  prestart: boolean;
  /** Pre-start only: seats left empty and NOT marked expected-late. */
  empty: PairSeat[];
  expectedLate: PairSeat[];
  lateArrive: PairSeat[];
  withdraw: { seat: PairSeat; fromRound?: number }[];
  handover: PairSeat[];
  treatment: { seat: PairSeat; treatment: AbsenceTreatmentFlag }[];
  tokens: boolean;
}

/** What the parser needs to know about the base fixture. */
export interface ScenarioContext {
  /** Tables per section. */
  tables: number;
  /** Rounds the movement is configured for. */
  rounds: number;
  play: Play;
  /** Board-pooled PAIRS (MP / XIMP) — the only fixtures these flags support. */
  boardPooledPairs: boolean;
}

const SCENARIO_FLAGS = [
  "--empty",
  "--expectedLate",
  "--lateArrive",
  "--withdraw",
  "--handover",
  "--treatment",
] as const;

const MAX_SECTIONS = 3;

const SEAT_PATTERN = /^([A-Z])(\d+)(NS|EW)$/;

/** Section letters for the first `count` sections: A, B, C… */
export function sectionLetters(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

/**
 * Every seat of a full field: both directions at every table of every section.
 * An even, fully-seated field — no sit-out — so start always validates.
 */
export function seatsFor(tables: number, sections = 1): PairSeat[] {
  const seats: PairSeat[] = [];
  for (const section of sectionLetters(sections)) {
    for (let t = 1; t <= tables; t++) {
      seats.push(
        `${section}${t}NS` as PairSeat,
        `${section}${t}EW` as PairSeat,
      );
    }
  }
  return seats;
}

/** Read a `--flag value` pair from argv (undefined when absent). */
function getFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** Split a comma list, dropping blanks. */
function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Validate one seat id against the field size; returns it as a PairSeat. */
function parseSeat(
  raw: string,
  flag: string,
  ctx: ScenarioContext,
  sections: number,
): PairSeat {
  const m = SEAT_PATTERN.exec(raw);
  if (!m) {
    throw new Error(
      `${flag}: "${raw}" is not a seat. Use e.g. A1NS or B3EW (section, table, NS/EW).`,
    );
  }
  const [, section, table] = m;
  if (!sectionLetters(sections).includes(section)) {
    throw new Error(
      `${flag}: seat ${raw} is in section ${section}, but there ${
        sections === 1
          ? "is only section A"
          : `are only sections ${sectionLetters(sections).join(", ")}`
      } (see --sections).`,
    );
  }
  if (Number(table) < 1 || Number(table) > ctx.tables) {
    throw new Error(
      `${flag}: seat ${raw} is at table ${table}, but each section has ${ctx.tables} table${ctx.tables === 1 ? "" : "s"} (see --tables).`,
    );
  }
  return raw as PairSeat;
}

function parseSeatList(
  argv: string[],
  flag: string,
  ctx: ScenarioContext,
  sections: number,
): PairSeat[] {
  const seats = splitList(getFlag(argv, flag)).map((s) =>
    parseSeat(s, flag, ctx, sections),
  );
  const dupe = seats.find((s, i) => seats.indexOf(s) !== i);
  if (dupe) throw new Error(`${flag}: seat ${dupe} is listed twice.`);
  return seats;
}

/**
 * Parse and validate the scenario flags. Throws an Error with a plain-English
 * message when the flags can't produce a coherent game (e.g. withdrawing a pair
 * when `--play all` has left it nothing to withdraw from).
 */
export function parseScenarioArgs(
  argv: string[],
  ctx: ScenarioContext,
): ScenarioArgs {
  const sectionsRaw = getFlag(argv, "--sections");
  const sections = sectionsRaw === undefined ? 1 : Number(sectionsRaw);
  const tokens = argv.includes("--tokens");
  const usesScenario =
    sections > 1 || SCENARIO_FLAGS.some((f) => argv.includes(f));

  if (usesScenario && !ctx.boardPooledPairs) {
    throw new Error(
      "--sections, --expectedLate, --lateArrive, --withdraw, --handover and --treatment " +
        "are only supported for the board-pooled pairs fixtures: --scoring MP or XIMP.",
    );
  }
  if (!Number.isInteger(sections) || sections < 1 || sections > MAX_SECTIONS) {
    throw new Error(
      `--sections must be a whole number from 1 to ${MAX_SECTIONS}.`,
    );
  }

  const prestart = argv.includes("--prestart");
  const empty = parseSeatList(argv, "--empty", ctx, sections);
  const expectedLate = parseSeatList(argv, "--expectedLate", ctx, sections);
  const lateArrive = parseSeatList(argv, "--lateArrive", ctx, sections);
  const handover = parseSeatList(argv, "--handover", ctx, sections);

  const withdraw = splitList(getFlag(argv, "--withdraw")).map((entry) => {
    const [seatRaw, roundRaw] = entry.split("@");
    const seat = parseSeat(seatRaw, "--withdraw", ctx, sections);
    if (roundRaw === undefined) return { seat };
    const fromRound = Number(roundRaw);
    if (
      !Number.isInteger(fromRound) ||
      fromRound < 1 ||
      fromRound > ctx.rounds
    ) {
      throw new Error(
        `--withdraw: round in "${entry}" must be a whole number from 1 to ${ctx.rounds} (see --rounds).`,
      );
    }
    return { seat, fromRound };
  });
  const withdrawSeats = withdraw.map((w) => w.seat);

  const treatment = splitList(getFlag(argv, "--treatment")).map((entry) => {
    const [seatRaw, valueRaw] = entry.split("=");
    const seat = parseSeat(seatRaw, "--treatment", ctx, sections);
    const value = (valueRaw ?? "").toUpperCase();
    if (value !== "AVERAGE" && value !== "REMOVED") {
      throw new Error(
        `--treatment: "${entry}" needs a value, e.g. ${seatRaw}=REMOVED or ${seatRaw}=AVERAGE.`,
      );
    }
    return { seat, treatment: value as AbsenceTreatmentFlag };
  });

  // --- cross-checks ---------------------------------------------------------

  if (empty.length > 0 && !prestart) {
    throw new Error(
      "--empty only makes sense with --prestart (it leaves the seat unmarked, as for a setup-screen test). " +
        "For a started game use --expectedLate.",
    );
  }
  for (const seat of empty) {
    if (expectedLate.includes(seat)) {
      throw new Error(
        `${seat} is in both --empty and --expectedLate; choose one (--empty leaves it unmarked).`,
      );
    }
  }
  if (
    prestart &&
    (lateArrive.length > 0 || withdraw.length > 0 || handover.length > 0)
  ) {
    throw new Error(
      "--lateArrive, --withdraw and --handover need a started game, so they can't be combined with --prestart.",
    );
  }

  for (const seat of lateArrive) {
    if (!expectedLate.includes(seat)) {
      throw new Error(
        `--lateArrive: ${seat} must also be listed in --expectedLate (only an expected-late seat can have a late arrival).`,
      );
    }
  }
  for (const seat of [...withdrawSeats, ...handover]) {
    if (expectedLate.includes(seat) || empty.includes(seat)) {
      throw new Error(
        `${seat} is an expected-late seat, so there is no pair to withdraw or hand over from. ` +
          `Use --lateArrive ${seat} first, or pick another seat.`,
      );
    }
  }
  for (const seat of handover) {
    if (withdrawSeats.includes(seat)) {
      throw new Error(`${seat} can't be both withdrawn and handed over.`);
    }
  }

  const totalSeats = seatsFor(ctx.tables, sections).length;
  if (new Set([...expectedLate, ...empty]).size >= totalSeats) {
    throw new Error(
      "--empty / --expectedLate: at least one pair must be seated.",
    );
  }

  if (ctx.play === "all" && (withdraw.length > 0 || handover.length > 0)) {
    throw new Error(
      "--withdraw / --handover need boards still to play, but --play all leaves none. " +
        "Use --play partial or --play round1.",
    );
  }

  if (lateArrive.length > 0) {
    // A latecomer is only "late" once results exist beyond round 1. `all`
    // fills every round; `partial` fills the first half of the rounds.
    const roundsWithResults =
      ctx.play === "all"
        ? ctx.rounds
        : ctx.play === "partial"
          ? Math.ceil(ctx.rounds / 2)
          : ctx.play === "round1"
            ? 1
            : 0;
    if (roundsWithResults < 2) {
      throw new Error(
        "--lateArrive needs results in round 2 or later, otherwise the pair simply " +
          "starts on time and is not late. Use --play all, or --play partial with --rounds 3 or more.",
      );
    }
  }

  for (const { seat } of treatment) {
    const covered =
      withdrawSeats.includes(seat) ||
      lateArrive.includes(seat) ||
      expectedLate.includes(seat);
    if (!covered) {
      throw new Error(
        `--treatment: ${seat} is not withdrawn, late or expected-late, so it has no missed boards to treat.`,
      );
    }
  }

  return {
    sections,
    prestart,
    empty,
    expectedLate,
    lateArrive,
    withdraw,
    handover,
    treatment,
    tokens,
  };
}
