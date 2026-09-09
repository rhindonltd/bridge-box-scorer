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
 * Close every per-pair device context in a seats map (as returned by the
 * setup helpers). Each pair page owns its own context, so closing the pages'
 * contexts tears down all the simulated devices in one call.
 */
export async function closeSeatDevices(
  seats: Record<string, Page>,
): Promise<void> {
  for (const page of Object.values(seats)) {
    await page.context().close();
  }
}

import { expect } from "@playwright/test";
import { io as ioClient } from "socket.io-client";
import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickFirstMovement,
  startGame,
  openSetupStep,
  addSection,
  selectSection,
} from "../fixtures/game-setup";
import {
  seatTwoTableFieldOnDevices,
  seatTwoTableSectionOnDevices,
} from "../fixtures/join";

/**
 * Set up a started two-table Howell pairs game end to end through the UI.
 *
 * Each pair joins from its OWN device context (mirroring reality: every pair
 * has their own phone), so each seat's player token lives on the page that will
 * later submit results. `seats` maps each section-qualified seat (e.g. "A1NS")
 * to that pair's page — use these to drive play so submissions are authorised.
 * `directorPage` is a separate context authorised for start/override/delete.
 */
export async function setUpStartedTwoTableGame(
  browser: Browser,
  eventName: string,
  opts: { recordOpeningLead?: boolean } = {},
): Promise<{
  directorPage: Page;
  gameId: string;
  seats: Record<string, Page>;
}> {
  const directorPage = await newParticipant(browser);

  const { gameId } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: opts.recordOpeningLead,
  });
  await setTableCount(directorPage, 2);
  await pickFirstMovement(directorPage);
  const seats = await seatTwoTableFieldOnDevices(
    () => newParticipant(browser),
    gameId,
  );
  await startGame(directorPage, gameId);

  return { directorPage, gameId, seats };
}

/**
 * Set up a STARTED two-section pairs game (sections A and B, two tables each)
 * end to end through the UI, seating both sections and starting.
 *
 * Section B is added via the shared "+ Add section" pill + naming modal, and
 * each section's movement is picked from its pill. Section B's table count is sized to 2
 * via the director socket service (a setup convenience — the Tables view shows
 * one stepper per section, which is press-and-hold and not the behaviour under
 * test here).
 *
 * Returns the director page and gameId. Opening-lead recording is off so any
 * later contract entry is short.
 */
export async function setUpStartedTwoSectionGame(
  browser: Browser,
  eventName: string,
): Promise<{
  directorPage: Page;
  gameId: string;
  seats: Record<string, Page>;
}> {
  const directorPage = await newParticipant(browser);

  const { gameId, directorToken } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: false,
  });

  // Section A: two tables (single stepper, before a second section exists).
  await setTableCount(directorPage, 2);

  // Add a second section via the "+ Add section" pill + naming modal.
  await openSetupStep(directorPage, "Movement");
  await addSection(directorPage);

  // Section B now exists (default table count). Size it to 2 tables via the
  // director socket service so both sections match.
  await sizeSectionTables(gameId, directorToken, "B", 2);
  // Let the director page's sections SWR list revalidate on GAME_UPDATED.
  await directorPage.waitForTimeout(500);

  // Pick the first recommended movement for each section: select its pill on
  // the Movement view, then choose and confirm the first recommendation.
  await pickMovementForSection(directorPage, "A");
  await pickMovementForSection(directorPage, "B");

  // Seat both sections, each pair from its own device, and start.
  const makePage = () => newParticipant(browser);
  const seatsA = await seatTwoTableSectionOnDevices(makePage, gameId, "A");
  const seatsB = await seatTwoTableSectionOnDevices(makePage, gameId, "B");
  await startGame(directorPage, gameId);

  return { directorPage, gameId, seats: { ...seatsA, ...seatsB } };
}

/**
 * Size a section's table count via the director socket service, over a direct
 * socket connection from the test (Node) process. This is a setup convenience:
 * the Tables view renders one press-and-hold stepper per section, which is not
 * the behaviour under test in the multi-section journey.
 */
async function sizeSectionTables(
  gameId: string,
  directorToken: string,
  section: string,
  tables: number,
): Promise<void> {
  const socket = ioClient("http://localhost:3000");
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket connect timeout")), 10_000);
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      socket.emit(
        "game:updateTables",
        { gameId, section, tables, directorToken },
        () => resolve(),
      );
    });
  } finally {
    socket.disconnect();
  }
}

/**
 * On the setup Movement view, select a section via its pill and choose the
 * first recommended movement for it.
 */
async function pickMovementForSection(page: Page, section: string): Promise<void> {
  await openSetupStep(page, "Movement");
  await selectSection(page, section);

  // Clicking a card only PREVIEWS it; the choice is committed by the
  // "Select Movement" button (enabled once the preview layout loads).
  const firstCard = page.getByTestId("movement-card").first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();

  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Selecting/ }),
  ).toHaveCount(0, { timeout: 15000 });
}
