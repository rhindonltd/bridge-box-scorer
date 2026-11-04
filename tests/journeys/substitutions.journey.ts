import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import {
  closeSeatDevices,
  directorHandover,
  gotoStable,
  setUpStartedTwoTableGame,
} from "./support";

/**
 * Substitutions journey (EBU §2.4.7, director screen).
 *
 * Once a seat has been handed over mid-game (the pair sitting it is pinned to
 * the boards it played, the arriving pair takes the rest), the director decides
 * on the dedicated "Substitutions" screen how that shared seat is scored, via
 * two toggles:
 *   - "Split by board?" — one merged line (default) vs two separate lines;
 *   - "Eligible for local ranking?" — per occupant (one merged toggle when not
 *     split, one per pair when split).
 * A substitution has no artificial score — the choices are just split +
 * eligibility.
 *
 * This drives the whole chain through real UI: play a board so there is a
 * played/unplayed split, hand the seat over to an arriving pair (director
 * modal), then open Substitutions, confirm the seat lists both occupants,
 * switch to two lines, mark the earlier pair not ranked, save, and prove it
 * persists by re-opening the screen and by reading the HTTP resource.
 */

test.describe("Substitutions (split + eligibility)", () => {
  test("a substituted seat's split + eligibility are set and persist", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Substitutions ${Date.now()}`,
      { recordOpeningLead: false },
    );

    try {
      // Play one board at table 1 so the earlier pair has a played board and the
      // arriving pair takes the rest as its own boards.
      await confirmBoardPassOut(seats["A1NS"], seats["A1EW"], gameId, 1, 1);

      // Hand A1NS over to an arriving pair (names only — no treatment choice).
      await directorHandover(directorPage, gameId, "A1NS", {
        player1: { firstName: "Real", lastName: "Arrival-One" },
        player2: { firstName: "Real", lastName: "Arrival-Two" },
      });

      // Open the Substitutions screen. The menu item only appears once a
      // handover has happened; navigate to the route directly (the StartedGuard
      // allows it on a started game).
      await gotoStable(directorPage, `/game/${gameId}/manage/substitutions`);
      await expect(
        directorPage.getByText(
          "A pair took over a seat part-way through.",
        ),
      ).toBeVisible({ timeout: 15000 });

      // The substituted seat lists both occupants with their board counts.
      await expect(directorPage.getByText("A1NS")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        directorPage.getByText(/Real Arrival-One & Real Arrival-Two — \d+ board/),
      ).toBeVisible({ timeout: 15000 });

      // Switch to two separate lines; the per-occupant eligibility toggles show.
      const splitGroup = directorPage.getByRole("group", {
        name: "Split by board?",
      });
      await expect(splitGroup).toBeVisible({ timeout: 15000 });
      await splitGroup.getByText("Two lines", { exact: true }).click();

      // Mark the arriving pair NOT ranked (its "ranked?" toggle → No).
      const arrivingGroup = directorPage.getByRole("group", {
        name: "Real Arrival-One & Real Arrival-Two ranked?",
      });
      await expect(arrivingGroup).toBeVisible({ timeout: 15000 });
      await arrivingGroup.getByText("No", { exact: true }).click();

      // Save and confirm the button reports success.
      await directorPage
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await expect(
        directorPage.getByRole("button", { name: "Saved", exact: true }),
      ).toBeVisible({ timeout: 15000 });

      // Persistence 1 — the HTTP resource reflects the stored split + the
      // arriving pair's ineligibility.
      const res = await request.get(`/api/games/${gameId}/substitutions`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const rows = body.result.substitutions as Array<{
        seat: string;
        split: boolean;
        occupants: Array<{ isArrivalAnchor: boolean; eligible: boolean }>;
      }>;
      const a1ns = rows.find((r) => r.seat === "A1NS");
      expect(a1ns, "A1NS should be a substituted seat").toBeTruthy();
      expect(a1ns!.split).toBe(true);
      const anchor = a1ns!.occupants.find((o) => o.isArrivalAnchor);
      expect(anchor, "the arriving (anchor) occupant").toBeTruthy();
      expect(anchor!.eligible).toBe(false);

      // Persistence 2 — re-opening the screen pre-fills from the server: it is
      // already split (two lines), so the per-occupant eligibility toggles are
      // present, showing the save round-tripped.
      await gotoStable(directorPage, `/game/${gameId}/manage/substitutions`);
      await expect(
        directorPage.getByText("A pair took over a seat part-way through."),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByRole("group", {
          name: "Real Arrival-One & Real Arrival-Two ranked?",
        }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
