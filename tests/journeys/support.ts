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
import { expect } from "@playwright/test";
import { io as ioClient } from "socket.io-client";
import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement, startGame } from "../fixtures/game-setup";
import { seatTwoTableField, seatTwoTableSection } from "../fixtures/join";

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

/**
 * Set up a STARTED two-section pairs game (sections A and B, two tables each)
 * end to end through the UI, seating both sections and starting.
 *
 * Section CRUD is driven through the real SectionManager UI (the "Add Section"
 * banner + per-section "Set Movement"). Section B's table count is sized to 2
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
): Promise<{ directorPage: Page; gameId: string }> {
  const directorPage = await newParticipant(browser);

  const { gameId, directorToken } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: false,
  });

  // Section A: two tables (single stepper, before a second section exists).
  await setTableCount(directorPage, 2);

  // Movement tab: the single-section picker shows an "Add Section" banner.
  await directorPage.getByRole("tab", { name: "Movement" }).click();
  await directorPage.getByRole("button", { name: "Add Section" }).click();

  // Section B now exists (default table count). Size it to 2 tables via the
  // director socket service so both sections match.
  await sizeSectionTables(gameId, directorToken, "B", 2);
  // Let the director page's sections SWR list revalidate on GAME_UPDATED.
  await directorPage.waitForTimeout(500);

  // Pick the first recommended movement for each section via the SectionManager
  // list ("Set Movement" opens the per-section picker; choose the first card).
  await pickMovementForSection(directorPage, "A");
  await pickMovementForSection(directorPage, "B");

  // Seat both sections and start.
  await seatTwoTableSection(directorPage, gameId, "A");
  await seatTwoTableSection(directorPage, gameId, "B");
  await startGame(directorPage, gameId);

  return { directorPage, gameId };
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
 * From the setup Movement tab's SectionManager list, open a section's movement
 * picker and choose the first recommended movement card.
 */
async function pickMovementForSection(page: Page, section: string): Promise<void> {
  await page.getByRole("tab", { name: "Movement" }).click();

  // The section row shows its "Section {letter}" heading and a Set/Change
  // Movement button. Scope the button to the section's row.
  const heading = page.getByText(`Section ${section}`, { exact: true });
  await expect(heading).toBeVisible({ timeout: 15000 });

  // The Set/Change Movement button sits within the same section block. There is
  // one per section; pick the one whose section we're targeting by ordinal.
  const setButtons = page.getByRole("button", { name: /Set Movement|Change Movement/ });
  // Sections render in order A, B, ... so index by letter offset from "A".
  const index = section.charCodeAt(0) - "A".charCodeAt(0);
  await setButtons.nth(index).click();

  const firstCard = page.getByTestId("movement-card").first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
}
