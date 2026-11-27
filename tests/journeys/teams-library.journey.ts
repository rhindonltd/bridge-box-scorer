import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  pickMovementByName,
  setTableCount,
  startGame,
} from "../fixtures/game-setup";
import { seatSingleSectionFieldOnDevices } from "../fixtures/join";
import { enterPassOut } from "../fixtures/play";
import { deleteGame } from "../fixtures/delete-game";
import {
  column,
  parseScore,
  readScoreTables,
  tableWithHeader,
} from "../fixtures/score-tables";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";
import { closeSeatDevices, newParticipant } from "./support";

/**
 * Teams games: American Whist, Circulation, Thurner and the teams movement
 * library.
 *
 * A Teams (not Swiss Teams) game's movement picker lists American Whist (for
 * an odd number of teams), Circulation (for four teams), Thurner (for an even
 * number of teams) and the library's teams movements for its table count,
 * grouped by boards played. Many of them play a match's two rooms in
 * different rounds (a team hosts one opponent while its away pair visits
 * another), so the seeded game below checks the scoring pairs those rooms up.
 */

test("a Teams game lists the teams library and selects a movement", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const director = await newParticipant(browser);
  const { gameId } = await createGame(director, {
    eventName: `Teams library ${Date.now()}`,
    recordOpeningLead: false,
    gameType: "TEAMS",
    teamsScoring: "IMP_VP",
  });
  try {
    await setTableCount(director, 5);
    const chosen = await pickMovementByName(
      director,
      "",
      "teams-movement-card",
    );
    expect(chosen).not.toBe("");
    // No pair movements are offered to a Teams game.
    await expect(director.getByTestId("movement-card")).toHaveCount(0);
    // Reopening the list shows the saved choice.
    await pickMovementByName(director, chosen, "teams-movement-card");
    await expect(
      director.locator(
        '[data-testid="teams-movement-card"][data-selected="true"]',
      ),
    ).toHaveText(new RegExp(chosen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await deleteGame(director, gameId);
    await director.context().close();
  }
});

test("a library movement with rooms in different rounds scores each match once", async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const teams = 5;
  // The first library movement for five teams, and the first board team 1's
  // home room plays.
  const [movement] = await (
    await request.get(`/api/movements/teams/${teams}`)
  )
    .json()
    .then((body) => body.result as { id: number }[]);
  const detail = await (
    await request.get(`/api/movements/teams/detail/${movement.id}`)
  )
    .json()
    .then(
      (body) =>
        body.result as {
          tables: {
            tableNumber: number;
            rounds: { ew: string; boardStart: number }[];
          }[];
        },
    );
  const board = detail.tables[0].rounds[0].boardStart;

  // Every room plays 3NT= (+400), except that board at table 1: 4S= (+420),
  // so team 1 wins 1 IMP in that match. The match's other room is played in
  // another round; the gain only counts if the two rooms are paired.
  const outcomes: Record<string, string> = { [`${board}@1`]: "4SN=" };
  for (let b = 1; b <= 200; b++) outcomes[`${b}`] = "3NTN=";
  const game = await seedGame({
    eventName: `Teams library score ${Date.now()}`,
    scoring: "TEAMS_LIBRARY",
    tables: teams,
    specId: movement.id,
    play: "all",
    outcomes,
  });
  const director = await openDirector(
    browser,
    game,
    `/game/${game.gameId}/display/leaderboard`,
  );
  try {
    await expect(director.getByTestId("leaderboard-row")).toHaveCount(teams, {
      timeout: 20000,
    });
    const table = tableWithHeader(await readScoreTables(director), "TEAM");
    const totals = Object.fromEntries(
      table.rows.map((row) => [row[1], parseScore(row[2])]),
    );
    // Each team plays one match per round; a tied match is 10 VP each, and a
    // match's 20 VP are always shared out in full.
    const level = 10 * game.rounds;
    expect(totals["Team A1NS"]).toBeGreaterThan(level);
    expect(
      column(table, "TOTAL")
        .map(parseScore)
        .reduce((a, b) => a + b, 0),
    ).toBeCloseTo(level * teams, 1);
  } finally {
    await closeDevices(director);
  }
});

test("an American Whist sends each away pair down two tables and plays", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const director = await newParticipant(browser);
  const { gameId } = await createGame(director, {
    eventName: `American Whist ${Date.now()}`,
    recordOpeningLead: false,
    gameType: "TEAMS",
    teamsScoring: "IMP_VP",
  });
  let seats: Record<string, import("@playwright/test").Page> = {};
  try {
    await setTableCount(director, 3);
    // The first card is American Whist at 6 boards a round (12 boards a team).
    const chosen = await pickMovementByName(
      director,
      "American Whist",
      "teams-movement-card",
    );
    expect(chosen).toBe("American Whist");
    seats = await seatSingleSectionFieldOnDevices(
      () => newParticipant(browser),
      gameId,
      3,
    );
    await startGame(director, gameId);

    // In round k, table t hosts team t + 2k's away pair (counting round past
    // 3), so in round 1 team 1's away pair plays at table 2, against team 2's
    // home pair, on board set 2 (boards 7-12). Confirming a board there proves
    // team 1's away pair was sent to the right table.
    await enterPassOut(seats["A2NS"], gameId, "A2NS", 7);
    await expect(
      seats["A2NS"].getByText("Waiting for confirmation"),
    ).toBeVisible({
      timeout: 15000,
    });
    await enterPassOut(seats["A1EW"], gameId, "A1EW", 7);
    await expect(seats["A2NS"].getByText("Board Results")).toBeVisible({
      timeout: 15000,
    });
  } finally {
    await deleteGame(director, gameId);
    await director.context().close();
    await closeSeatDevices(seats);
  }
});
test("a Circulation starts each table on its own boards and sends the away pair home to score up", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const director = await newParticipant(browser);
  const { gameId } = await createGame(director, {
    eventName: `Circulation ${Date.now()}`,
    recordOpeningLead: false,
    gameType: "TEAMS",
    teamsScoring: "IMP_VP",
  });
  let seats: Record<string, import("@playwright/test").Page> = {};
  try {
    await setTableCount(director, 4);
    // The first Circulation card is 4 boards a round: one to a table.
    const chosen = await pickMovementByName(
      director,
      "Circulation",
      "teams-movement-card",
    );
    expect(chosen).toBe("Circulation");
    seats = await seatSingleSectionFieldOnDevices(
      () => newParticipant(browser),
      gameId,
      4,
    );
    await startGame(director, gameId);
    // Round 1 is team 1 v team 2: team 1's away pair plays at table 2, which
    // starts on board 2 and then plays the boards passed down to it.
    const home = seats["A2NS"];
    const away = seats["A1EW"];
    await home.goto(`/game/${gameId}/play/A2NS`);
    await expect(home.getByTestId("round-first-board")).toHaveText(
      "Start with board 2",
      { timeout: 15000 },
    );
    for (const board of [2, 3, 4, 1]) {
      await enterPassOut(home, gameId, "A2NS", board);
      await expect(home.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });
      await enterPassOut(away, gameId, "A1EW", board);
      await expect(away.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
    }
    // The round is the whole match, so the away pair goes home to score up.
    await away.getByTestId("board-results-next").click();
    await expect(away.getByTestId("score-break")).toContainText(
      "Go back to your home table",
      { timeout: 15000 },
    );
    await expect(away.getByTestId("score-break")).toContainText("Table 1");
    await away.getByTestId("score-break-continue").click();
    // Then the team results, and on to team 3's table for round 2.
    await away.getByTestId("round-results-continue").click();
    await expect(away.getByText("Move to")).toBeVisible({ timeout: 15000 });
    await expect(away.getByText("Table 3")).toBeVisible();
  } finally {
    await deleteGame(director, gameId);
    await director.context().close();
    await closeSeatDevices(seats);
  }
});
test("a Thurner shares the satellite table's boards and tells both tables", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const director = await newParticipant(browser);
  const { gameId } = await createGame(director, {
    eventName: `Thurner ${Date.now()}`,
    recordOpeningLead: false,
    gameType: "TEAMS",
    teamsScoring: "IMP_VP",
  });
  let seats: Record<string, import("@playwright/test").Page> = {};
  try {
    await setTableCount(director, 6);
    // The first Thurner card is 3 boards a round (15 boards a team).
    const chosen = await pickMovementByName(
      director,
      "Thurner",
      "teams-movement-card",
    );
    expect(chosen).toBe("Thurner");
    seats = await seatSingleSectionFieldOnDevices(
      () => newParticipant(browser),
      gameId,
      6,
    );
    await startGame(director, gameId);
    // Round 1: team 6's away pair visits table 1, and the satellite table 6
    // plays the same boards (1-3) against team 1's away pair.
    for (const [seat, other] of [
      ["A1NS", 6],
      ["A6NS", 1],
    ] as const) {
      await seats[seat].goto(`/game/${gameId}/play/${seat}`);
      await expect(seats[seat].getByTestId("round-shared-boards")).toHaveText(
        `Share these boards with Table ${other}`,
        { timeout: 15000 },
      );
    }
    await seats["A2NS"].goto(`/game/${gameId}/play/A2NS`);
    await expect(seats["A2NS"].getByTestId("play-enter-round")).toBeVisible({
      timeout: 15000,
    });
    await expect(seats["A2NS"].getByTestId("round-shared-boards")).toHaveCount(
      0,
    );
    // The satellite's match is real: team 1's away pair confirms board 1 there.
    await enterPassOut(seats["A6NS"], gameId, "A6NS", 1);
    await expect(
      seats["A6NS"].getByText("Waiting for confirmation"),
    ).toBeVisible({ timeout: 15000 });
    await enterPassOut(seats["A1EW"], gameId, "A1EW", 1);
    await expect(seats["A6NS"].getByText("Board Results")).toBeVisible({
      timeout: 15000,
    });
  } finally {
    await deleteGame(director, gameId);
    await director.context().close();
    await closeSeatDevices(seats);
  }
});
test("a Stagger shares each pair of tables' boards and scores up after the first stanza", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const director = await newParticipant(browser);
  const { gameId } = await createGame(director, {
    eventName: `Stagger ${Date.now()}`,
    recordOpeningLead: false,
    gameType: "TEAMS",
    teamsScoring: "IMP_VP",
  });
  let seats: Record<string, import("@playwright/test").Page> = {};
  try {
    await setTableCount(director, 6);
    // The first Stagger card is 3 boards a round (15 boards a team).
    const chosen = await pickMovementByName(
      director,
      "Stagger",
      "teams-movement-card",
    );
    expect(chosen).toBe("Stagger");
    seats = await seatSingleSectionFieldOnDevices(
      () => newParticipant(browser),
      gameId,
      6,
    );
    await startGame(director, gameId);
    // Tables 1 and 4 share board set 1 every round of the first stanza.
    await seats["A1NS"].goto(`/game/${gameId}/play/A1NS`);
    await expect(seats["A1NS"].getByTestId("round-shared-boards")).toHaveText(
      "Share these boards with Table 4",
      { timeout: 15000 },
    );
    // The first stanza is rounds 1 and 2. Team 1's away pair plays at table 5
    // (boards 4-6), then table 3 (boards 1-3). Table 3 first finishes its own
    // round 1, against team 5's away pair on boards 7-9.
    const away = seats["A1EW"];
    for (const [home, visitor, boards] of [
      ["A5NS", "A1EW", [4, 5, 6]],
      ["A3NS", "A5EW", [7, 8, 9]],
      ["A3NS", "A1EW", [1, 2, 3]],
    ] as const) {
      for (const board of boards) {
        await enterPassOut(seats[home], gameId, home, board);
        await expect(
          seats[home].getByText("Waiting for confirmation"),
        ).toBeVisible({ timeout: 15000 });
        await enterPassOut(seats[visitor], gameId, visitor, board);
        await expect(seats[visitor].getByText("Board Results")).toBeVisible({
          timeout: 15000,
        });
      }
    }
    // Every match of the first stanza is finished: a score break.
    await away.getByTestId("board-results-next").click();
    await expect(away.getByTestId("score-break")).toContainText("Table 1", {
      timeout: 15000,
    });
  } finally {
    await deleteGame(director, gameId);
    await director.context().close();
    await closeSeatDevices(seats);
  }
});
