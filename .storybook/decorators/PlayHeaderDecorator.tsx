import React from "react";
import { PlayHeaderMenu } from "@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu";
import type { HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { mockGame } from "@/mocks/fixtures/game";

/**
 * The real play-header hamburger, for use as the `headerRight` arg in play-page
 * stories. Using the actual {@link PlayHeaderMenu} (rather than a stand-in)
 * keeps the stories accurate: the menu shows the same "Change device" / "Pair
 * details" options players see in the app.
 *
 * `extraItems` mirrors what a screen contributes in the app (e.g. the board
 * results screen adds its "Results / Deal" view choice), so a story that shows
 * such a screen can reproduce the exact menu the user sees.
 *
 * Requires the story to provide the game + assignment contexts (the `withGame`
 * / `withAssignment` decorators) and the Next.js app-router parameter
 * (`nextjs: { appDirectory: true }`), since the menu reads the game/assignment
 * and renders the director play→manage switch.
 */
export const storyPlayHeader = (
  seat = "A1NS",
  extraItems: HeaderMenuItem[] = [],
): React.ReactNode => (
  <PlayHeaderMenu gameId={mockGame.gameId} seat={seat} extraItems={extraItems} />
);
