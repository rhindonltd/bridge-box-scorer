import { Page, expect } from "@playwright/test";

/**
 * Fill a full, legal deal into a mounted DealEntry grid and save it.
 *
 * Gives each direction one whole suit (N=spades, E=hearts, S=diamonds,
 * W=clubs), which is a valid 52-card deal. Selects each direction tab, taps its
 * 13 ranks, then clicks the save button (enabled only once the deal is
 * complete). Works for both the player "Save cards" and director "Save deal"
 * buttons since both carry the `deal-entry-save` test id.
 */
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUIT_FOR: Record<"N" | "E" | "S" | "W", string> = {
  N: "S",
  E: "H",
  S: "D",
  W: "C",
};

export async function fillAndSaveFullDeal(page: Page): Promise<void> {
  for (const dir of ["N", "E", "S", "W"] as const) {
    await page.getByTestId(`entry-dir-${dir}`).click();
    for (const rank of RANKS) {
      // Card test ids are suit-first (e.g. "card-SA"), matching the suit-first
      // Card code convention.
      await page.getByTestId(`card-${SUIT_FOR[dir]}${rank}`).click();
    }
  }

  const save = page.getByTestId("deal-entry-save");
  await expect(save).toBeEnabled({ timeout: 15000 });
  await save.click();
}
