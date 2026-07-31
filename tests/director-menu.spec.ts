import { test, expect } from "./fixtures/director-fixture";

/**
 * Director Menu E2E Tests
 *
 * Tests the director menu page that provides navigation to
 * Timer, Travellers, Change Game Status, Movement, Download USEBIO, and Delete Game.
 */

test.describe("Director Menu", () => {
  test("director menu renders all 6 buttons", async ({ directorContext }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);

    await expect(
      page.getByRole("button", { name: "Create/Amend Timer" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Travellers" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Change Game Status" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Movement" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Download USEBIO" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Delete Game" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Timer button navigates to /manage/[id]/timer", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Create/Amend Timer" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/timer`);
  });

  test("Travellers button navigates to /manage/[id]/correct-result", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Travellers" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/correct-result`);
  });

  test("Change Game Status button navigates to /manage/[id]/change-status", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Change Game Status" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/change-status`);
  });

  test("Movement button navigates to /manage/[id]/movement", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Movement" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/movement`);
  });

  test("Download USEBIO button navigates to /manage/[id]/download-usebio", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Download USEBIO" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/download-usebio`);
  });

  test("Delete Game button navigates to /manage/[id]/delete-game", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/menu`);
    await page.getByRole("button", { name: "Delete Game" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/delete-game`);
  });
});
