import { test } from "@playwright/test";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

async function dumpButtons(page: import("@playwright/test").Page, label: string) {
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button"))
      .filter((b) => (b as HTMLElement).offsetParent !== null)
      .map((b) => JSON.stringify((b.textContent ?? "").trim())),
  );
  console.log(`\n=== ${label} ===\n${names.join("\n")}`);
}

test("scratch: dump wizard buttons", async ({ browser }) => {
  test.setTimeout(120_000);
  const { directorPage, gameId } = await setUpStartedTwoTableGame(
    browser,
    `Scratch ${Date.now()}`,
    { recordOpeningLead: false },
  );
  const ns = await newParticipant(browser);
  try {
    await ns.goto(`/game/${gameId}/play/A1NS`);
    await ns.getByTestId("play-enter-round").click();
    await dumpButtons(ns, "board select");
    await ns.getByTestId("wizard-board-1").click();
    await dumpButtons(ns, "level");
    await ns.getByRole("button", { name: "4", exact: true }).click();
    await dumpButtons(ns, "suit");
    console.log("clicking suit 4H via filter/hasText...");
    await ns
      .locator("button")
      .filter({ hasText: /^4\u2665$/ })
      .click({ timeout: 8000 });
    await dumpButtons(ns, "declarer");
    console.log("clicking declarer 4HN...");
    await ns
      .locator("button")
      .filter({ hasText: /^4\u2665N$/ })
      .click({ timeout: 8000 });
    await dumpButtons(ns, "result (lead off)");
  } finally {
    await deleteGame(directorPage, gameId);
    await directorPage.context().close();
    await ns.context().close();
  }
});
