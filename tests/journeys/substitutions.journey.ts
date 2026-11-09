import { test, expect } from "@playwright/test";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";
import { gotoStable } from "./support";

/**
 * Substitutions journey (EBU §2.4.7, director screen).
 *
 * Once a seat has been handed over mid-game (the pair sitting it keeps the
 * boards it played, the arriving pair takes the rest), the director decides on
 * the Pairs screen how that shared seat is scored. The seat's card carries:
 *   - "Split by board?" — one merged line (default) vs two separate lines;
 *   - "Main pair" — which pair represents a merged line;
 *   - "Eligible for local ranking?" — per pair.
 * A substitution has no artificial score, so these are the only choices, and
 * each change saves as soon as it is made (there is no Save button).
 *
 * The handover itself is seeded (the seeder runs the same handover engine the
 * player-driven flow uses; that flow has its own journeys). This test drives
 * the director's side through real UI: open the seat on the Pairs screen,
 * switch to two lines, mark the arriving pair not ranked, and prove both
 * choices persist by reading the HTTP resource and reloading the screen.
 */
test.describe("Substitutions (split + eligibility)", () => {
  test("a substituted seat's split + eligibility are set and persist", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const game = await seedGame({
      scoring: "MP",
      tables: 2,
      movement: "recommended",
      play: "partial",
      eventName: `Substitutions ${Date.now()}`,
      scenario: { handover: ["A1NS"] },
    });
    const director = await openDirector(browser, game);
    const gameId = game.gameId;

    try {
      await gotoStable(director, `/game/${gameId}/manage/pairs`);

      // The substituted seat's row names both pairs and explains the status.
      await expect(
        director.getByText("A pair took over part-way through"),
      ).toBeVisible({ timeout: 15000 });

      // Open the seat's card (rows are collapsed until tapped).
      await director.getByRole("button", { name: /SubA1NS/ }).click();

      // The card lists both occupants with their board counts, and the
      // arriving pair (the merged line's default main pair) is pre-selected.
      const arrivingMain = director.getByRole("radio", {
        name: /Make SubA1NS .* the main pair/,
      });
      await expect(arrivingMain).toBeChecked({ timeout: 15000 });
      await expect(director.getByText(/— \d+ boards?/)).toHaveCount(2);

      // Switch to two separate lines; this auto-saves.
      const splitGroup = director.getByRole("group", {
        name: "Split by board?",
      });
      await expect(splitGroup).toBeVisible({ timeout: 15000 });
      await splitGroup.getByText("Two lines", { exact: true }).click();

      // Mark the arriving pair NOT ranked via the "Eligible" toggle inside its
      // own card.
      const arrivingCard = director
        .getByText(/SubA1NS South\s*— \d+ boards?/)
        .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
      await arrivingCard
        .getByRole("group", { name: "Eligible for local ranking?" })
        .getByText("No", { exact: true })
        .click();

      // Persistence 1 — the HTTP resource reflects the stored split + the
      // arriving pair's ineligibility (poll: the save is asynchronous).
      await expect
        .poll(
          async () => {
            const res = await request.get(`/api/games/${gameId}/substitutions`);
            if (!res.ok()) return null;
            const rows = (await res.json()).result.substitutions as Array<{
              seat: string;
              split: boolean;
              occupants: Array<{
                isArrivalAnchor: boolean;
                eligible: boolean;
              }>;
            }>;
            const a1ns = rows.find((r) => r.seat === "A1NS");
            const anchor = a1ns?.occupants.find((o) => o.isArrivalAnchor);
            return a1ns && anchor
              ? { split: a1ns.split, anchorEligible: anchor.eligible }
              : null;
          },
          { timeout: 15000 },
        )
        .toEqual({ split: true, anchorEligible: false });

      // Persistence 2 — re-opening the screen pre-fills from the server: the
      // seat is already on two lines, so there is no "Main pair" choice.
      await gotoStable(director, `/game/${gameId}/manage/pairs`);
      await director.getByRole("button", { name: /SubA1NS/ }).click();
      await expect(
        director
          .getByRole("group", { name: "Split by board?" })
          .getByRole("button", { name: "Two lines" }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
      await expect(
        director.getByText("Main pair", { exact: true }),
      ).toHaveCount(0);
    } finally {
      await closeDevices(director);
    }
  });
});
