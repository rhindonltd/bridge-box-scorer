"use client";

import { HeaderMenu } from "@/components/layout/HeaderMenu";
import {
  PlayManageSwitch,
  usePlayManageSwitchItem,
} from "@/components/game/PlayManageSwitch";

/**
 * The manage-side play⇄manage switch for a game header's right-hand slot: a
 * visible "Play" / "Join" button at `sm`+ and, below `sm`, a hamburger whose
 * single item is the same switch (so exactly one appears per breakpoint). The
 * label/target is resolved by {@link PlayManageSwitch} — "Play" to this
 * device's seat when it holds one, otherwise "Join" to take a seat.
 *
 * No director check here: the manage routes are already director-gated by their
 * route guard, so anyone seeing this header is a director.
 */
export function ManageHeaderSwitch({ gameId }: { gameId: string }) {
  const item = usePlayManageSwitchItem(gameId, "toPlay");

  return (
    <span className="flex items-center gap-2">
      <PlayManageSwitch gameId={gameId} direction="toPlay" />
      <span className="sm:hidden">
        <HeaderMenu items={[item]} label="Menu" />
      </span>
    </span>
  );
}
