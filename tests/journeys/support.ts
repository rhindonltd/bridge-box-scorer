import { Browser, Page, test } from "@playwright/test";

/**
 * Open a fresh browser context + page using the active journey project's
 * device config, so each simulated participant (director, display, each pair)
 * has an isolated context — separate localStorage, separate sockets — exactly
 * like separate physical devices on the club LAN.
 */
export async function newParticipant(browser: Browser): Promise<Page> {
  const context = await browser.newContext(test.info().project.use);
  return context.newPage();
}

/**
 * Set up a started two-table Howell pairs game end to end through the UI:
 * create, two tables, first recommended movement, seat all four pairs, start.
 * Returns the director page (authorised for start/override/delete) and gameId.
 */
import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement, startGame } from "../fixtures/game-setup";
import { seatTwoTableField } from "../fixtures/join";

export async function setUpStartedTwoTableGame(
  browser: Browser,
  eventName: string,
  opts: { recordOpeningLead?: boolean } = {},
): Promise<{ directorPage: Page; gameId: string }> {
  const directorPage = await newParticipant(browser);

  const { gameId } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: opts.recordOpeningLead,
  });
  await setTableCount(directorPage, 2);
  await pickFirstMovement(directorPage);
  await seatTwoTableField(directorPage, gameId);
  await startGame(directorPage, gameId);

  return { directorPage, gameId };
}
