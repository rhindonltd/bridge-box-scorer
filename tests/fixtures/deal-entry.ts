import { Page, expect } from "@playwright/test";

/**
 * Fill a full, legal deal into a mounted DealEntry grid and save it.
 *
 * Gives each direction one whole suit (N=spades, E=hearts, S=diamonds,
 * W=clubs), which is a valid 52-card deal. For each direction it selects the
 * direction tab, selects that direction's suit tab, then taps the suit's 13
 * ranks, and finally clicks the save button (enabled only once the deal is
 * complete). Works for both the player "Save cards" and director "Save deal"
 * buttons since both carry the `deal-entry-save` test id.
 *
 * The grid shows ONE suit at a time (so the rank buttons stay tappable on a
 * phone): the rank buttons for a suit are only in the DOM while that suit's tab
 * is active. The suit tab must therefore be clicked before its ranks — the suit
 * is component-level state, not per-direction, so it does not reset when the
 * direction changes.
 */
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUIT_FOR: Record<"N" | "E" | "S" | "W", string> = {
  N: "S",
  E: "H",
  S: "D",
  W: "C",
};

export async function fillAndSaveFullDeal(page: Page): Promise<void> {
  // Fill only THREE hands (N=spades, E=hearts, S=diamonds). Once three hands
  // hold 13 each, the grid auto-fills the fourth (West = the remaining clubs),
  // so tapping West's cards would DESELECT the auto-filled clubs and leave the
  // deal incomplete. Filling three and letting the fourth resolve matches the
  // component's own behaviour.
  for (const dir of ["N", "E", "S"] as const) {
    const suit = SUIT_FOR[dir];
    await page.getByTestId(`entry-dir-${dir}`).click();
    // Select this direction's suit so its rank buttons are rendered.
    await page.getByTestId(`entry-suit-${suit}`).click();
    for (const rank of RANKS) {
      // Card test ids are suit-first (e.g. "card-SA"), matching the suit-first
      // Card code convention.
      await page.getByTestId(`card-${suit}${rank}`).click();
    }
  }

  const save = page.getByTestId("deal-entry-save");
  await expect(save).toBeEnabled({ timeout: 15000 });
  await save.click();
}
