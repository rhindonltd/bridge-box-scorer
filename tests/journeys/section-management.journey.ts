import { test, expect } from "@playwright/test";
import {
  createGameStep,
  attachScreenshot,
  cleanupGames,
  deleteGameStep,
} from "./helpers";

const BASE_URL = "http://localhost:3000";

/**
 * Director-driven section management: a game starts with a default section "A";
 * the director adds a second section "B", sets a per-section movement on each,
 * and both are readable via the sections API. Section CRUD + movement are
 * driven through the section socket events (avoids fragile selectors) and
 * verified through the sections API and the manage UI.
 */

test.beforeAll(async () => {
  await cleanupGames(BASE_URL);
});

test.afterAll(async () => {
  await cleanupGames(BASE_URL);
});

test("Director manages multiple sections and per-section movements", async ({
  browser,
}, testInfo) => {
  const deviceConfig = test.info().project.use;
  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  let gameId = "";
  let directorToken = "";

  try {
    const eventName = `E2E Journey - Sections - ${Date.now()}`;
    ({ gameId, directorToken } = await createGameStep(directorPage, testInfo, {
      eventName,
      directorName: "E2E Director",
      tables: 3,
    }));

    // The default section "A" is seeded at creation.
    await test.step("Game starts with a default section A", async () => {
      const res = await fetch(`${BASE_URL}/api/games/${gameId}/sections`);
      const body = await res.json();
      const sections = body.result.sections;
      expect(sections.map((s: { section: string }) => s.section)).toEqual([
        "A",
      ]);
    });

    // Drive section CRUD + movement over a dedicated socket (stable, no UI
    // race conditions), mirroring selectMovementStep's approach.
    const { io } = await import("socket.io-client");
    const socket = io(BASE_URL, { forceNew: true });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 5000);
      socket.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
    });

    function emit(event: string, payload: Record<string, unknown>) {
      return new Promise<{ success: boolean; error?: string }>(
        (resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error(`${event} timeout`)),
            10000,
          );
          socket.emit(event, { ...payload, gameId, directorToken }, (res: {
            success: boolean;
            error?: string;
          }) => {
            clearTimeout(timer);
            resolve(res);
          });
        },
      );
    }

    await test.step("Director adds section B and sets its table count", async () => {
      const created = await emit("game:createSection", {
        section: "B",
        tables: 4,
      });
      expect(created.success).toBe(true);
    });

    await test.step("Director sets a movement on each section", async () => {
      const a = await emit("game:setSectionMovement", {
        section: "A",
        mitchell: { tables: 3, rounds: 3, boardsPerRound: 3 },
      });
      const b = await emit("game:setSectionMovement", {
        section: "B",
        mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
      });
      expect(a.success).toBe(true);
      expect(b.success).toBe(true);
    });

    socket.disconnect();

    await test.step("Both sections are readable with their movements", async () => {
      const res = await fetch(`${BASE_URL}/api/games/${gameId}/sections`);
      const body = await res.json();
      const sections = body.result.sections as Array<{
        section: string;
        tables: number;
        selectedMovement: { source: string } | null;
      }>;

      expect(sections.map((s) => s.section)).toEqual(["A", "B"]);
      const b = sections.find((s) => s.section === "B")!;
      expect(b.tables).toBe(4);
      expect(sections.every((s) => s.selectedMovement?.source === "MITCHELL")).toBe(
        true,
      );
    });

    await test.step("Manage sections page shows both sections", async () => {
      await directorPage.goto(`/game/${gameId}/manage/sections`);
      await directorPage.waitForLoadState("networkidle");
      await expect(directorPage.getByText("Section A")).toBeVisible({
        timeout: 10000,
      });
      await expect(directorPage.getByText("Section B")).toBeVisible();
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Manage sections (A and B)",
      );
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await directorContext.close();
  }
});
