import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Browser, BrowserContext, Page, expect, test } from "@playwright/test";

import { E2E_BASE_URL, E2E_SERVER_ENV, REPO_ROOT } from "../e2e-env";
import type {
  SeedGameOptions,
  SeedGameResult,
} from "../../src/scripts/e2e-seed/seed-game";

export type { SeedGameOptions, SeedGameResult };

const run = promisify(execFile);

/**
 * Seed a game straight into the E2E data directory — created, seated, started
 * and (optionally) part-played, withdrawn, handed over… — in one call, instead
 * of driving the create / setup / join screens.
 *
 * Runs the same `seedGame` the manual-test CLI uses, in a child process (so the
 * test runner never loads server code), against the same data directory the
 * E2E server reads. Seeded players are named after their seat
 * ("PA1NS North & PA1NS South"); every seat's token is in `result.seats`.
 */
export async function seedGame(
  options: SeedGameOptions = {},
): Promise<SeedGameResult> {
  const tsx = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
  try {
    const { stdout } = await run(
      tsx,
      [
        "--require",
        "./scripts/allow-server-only.cjs",
        "src/scripts/e2e-seed/seed-json.ts",
        JSON.stringify({ play: "none", ...options }),
      ],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, ...E2E_SERVER_ENV },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const line = stdout.trim().split("\n").pop() ?? "";
    return JSON.parse(line) as SeedGameResult;
  } catch (err) {
    const stderr =
      (err as { stderr?: string }).stderr?.trim() ||
      (err instanceof Error ? err.message : String(err));
    throw new Error(`seedGame failed: ${stderr}`);
  }
}

/**
 * A fresh, isolated browser context (its own localStorage and socket — one per
 * simulated device) with the given localStorage entries planted ONCE, before
 * the first page loads. Planting via the context's initial storage (rather than
 * an init script) means the app can later clear a token — e.g. after a
 * withdrawal — and it stays cleared.
 */
export async function newDevice(
  browser: Browser,
  localStorage: Record<string, string> = {},
): Promise<BrowserContext> {
  return browser.newContext({
    ...test.info().project.use,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: E2E_BASE_URL,
          localStorage: Object.entries(localStorage).map(([name, value]) => ({
            name,
            value,
          })),
        },
      ],
    },
  });
}

/** localStorage entry that makes a device the game's director. */
export function directorStorage(game: SeedGameResult): Record<string, string> {
  return { [`director:${game.gameId}`]: game.directorToken };
}

/** localStorage entry that makes a device hold `seat`. */
export function seatStorage(
  game: SeedGameResult,
  seat: string,
  token = game.seats[seat]?.token,
): Record<string, string> {
  if (!token) {
    throw new Error(
      `No token for ${seat} in game ${game.gameId} (seats: ${Object.keys(game.seats).join(", ")}).`,
    );
  }
  return {
    [`player:${game.gameId}`]: JSON.stringify({
      startingPosition: seat,
      token,
    }),
  };
}

/** A director device, opened on the Manage Game Menu. */
export async function openDirector(
  browser: Browser,
  game: SeedGameResult,
  url = `/game/${game.gameId}/manage`,
): Promise<Page> {
  const context = await newDevice(browser, directorStorage(game));
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "commit" });
  return page;
}

/**
 * A device holding `seat`, opened on its play screen. Waits until the play
 * screen has rendered (the header menu is the anchor every play state shares).
 */
export async function openSeat(
  browser: Browser,
  game: SeedGameResult,
  seat: string,
  token?: string,
): Promise<Page> {
  const context = await newDevice(browser, seatStorage(game, seat, token));
  const page = await context.newPage();
  await page.goto(`/game/${game.gameId}/play/${seat}`, { waitUntil: "commit" });
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({
    timeout: 15000,
  });
  return page;
}

/** One device per seat (all seats by default), keyed by seat. */
export async function openSeats(
  browser: Browser,
  game: SeedGameResult,
  seats: string[] = Object.keys(game.seats),
): Promise<Record<string, Page>> {
  const pages: Record<string, Page> = {};
  for (const seat of seats) {
    pages[seat] = await openSeat(browser, game, seat);
  }
  return pages;
}

/**
 * Drop-in replacement for the old UI-built "started two-table game": a 2-table
 * pairs game on the movement the setup screen recommends first (a Howell —
 * 3 rounds of 8 boards), started, nothing played, with a director device and a
 * device per seat already on its play screen.
 */
export async function seedStartedTwoTableGame(
  browser: Browser,
  eventName: string,
  opts: { recordOpeningLead?: boolean; handEntry?: boolean } & Omit<
    SeedGameOptions,
    "eventName" | "tables" | "movement" | "leadCardRequired"
  > = {},
): Promise<{
  game: SeedGameResult;
  directorPage: Page;
  gameId: string;
  seats: Record<string, Page>;
}> {
  const { recordOpeningLead, handEntry, ...rest } = opts;
  const game = await seedGame({
    scoring: "MP",
    tables: 2,
    movement: "recommended",
    eventName,
    leadCardRequired: recordOpeningLead ?? true,
    handEntry,
    ...rest,
  });
  const directorPage = await openDirector(browser, game);
  const seats = await openSeats(browser, game);
  return { game, directorPage, gameId: game.gameId, seats };
}

/** Close every device a journey opened. */
export async function closeDevices(...pages: (Page | Record<string, Page>)[]) {
  for (const p of pages) {
    const list = "context" in p ? [p as Page] : Object.values(p);
    for (const page of list) await page.context().close();
  }
}
