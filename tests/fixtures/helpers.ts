import { expect, Page, APIRequestContext } from "@playwright/test";

/** Navigate to a director sub-page, with director token already in localStorage */
export async function navigateToDirectorPage(
  page: Page,
  gameId: string,
  subPage: string
): Promise<void> {
  await page.goto(`/manage/${gameId}/${subPage}`);
  await page.waitForLoadState("networkidle");
}

/** Intercept an API route and return a custom response */
export async function interceptRoute(
  page: Page,
  urlPattern: string | RegExp,
  response: { status: number; body: object }
): Promise<void> {
  await page.route(urlPattern, (route) =>
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    })
  );
}

/** Transition a game to JOINABLE status via the REST API */
export async function makeGameJoinable(
  request: APIRequestContext,
  gameId: string,
  directorToken: string
): Promise<void> {
  const res = await request.post(`/api/games/${gameId}/status`, {
    data: { status: "JOINABLE", directorToken },
  });
  expect(res.ok()).toBe(true);
}

/** Enter the settings PIN to bypass the PinEntryPage gate */
export async function enterSettingsPin(page: Page): Promise<void> {
  await expect(page.getByText("Enter PIN to continue")).toBeVisible({ timeout: 10000 });
  await page.getByLabel("PIN").fill("1234");
  await page.getByRole("button", { name: "Enter" }).click();
}
