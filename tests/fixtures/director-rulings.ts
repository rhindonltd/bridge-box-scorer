import { Page, expect } from "@playwright/test";

import { openDirectorTraveller } from "./director-override";

/**
 * Director rulings through the real screens: Manage > Travellers > a board >
 * a row, which opens the adjustment hub. Each ruling is a hub button followed by
 * one choice. Must run in a director-authorised context.
 */

/** The hub buttons a director is offered, in screen order. */
export async function hubChoices(page: Page): Promise<string[]> {
  // Wait for the hub itself (its first button) before reading the list.
  await expect(
    page.getByRole("button", { name: "Enter Contract", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const labels = await page.getByRole("button").allInnerTexts();
  // The header has icon-only buttons (back, menu): keep the hub's own labels.
  const known = [
    "Enter Contract",
    "Adjusted Score",
    "Weighted Score",
    "Cancel / Foul Board",
    "Mark Played Reversed",
    "Clear Reversed",
    "Board Not Played (Teams)",
    "Void Match (Teams)",
    "Void Match (Pairs)",
    "Mismatch (Swiss)",
  ];
  return labels.map((l) => l.trim()).filter((l) => known.includes(l));
}

/** Open a board's traveller and tap a row, landing on the adjustment hub. */
export async function openHub(
  page: Page,
  gameId: string,
  board: number,
  rowTestId: string,
): Promise<void> {
  await openDirectorTraveller(page, gameId, board);
  await page.getByTestId(rowTestId).click();
}

/**
 * Apply one ruling: open the hub for the row, choose the hub button, then the
 * option (matched by its visible title). Waits for the redirect back to the
 * manage menu that a saved ruling ends with.
 */
export async function applyRuling(
  page: Page,
  gameId: string,
  board: number,
  rowTestId: string,
  hubButton: string,
  option: RegExp | string,
): Promise<void> {
  await openHub(page, gameId, board, rowTestId);
  await page.getByRole("button", { name: hubButton, exact: true }).click();
  await page.getByRole("button", { name: option }).click();
  await page.waitForURL(/\/game\/[^/]+\/manage$/, { timeout: 15000 });
}
