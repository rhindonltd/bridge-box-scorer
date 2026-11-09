"use client";

import { HeaderMenu } from "@/components/layout/HeaderMenu";
import {
  PlayManageSwitch,
  usePlayManageSwitchItem,
} from "@/components/game/PlayManageSwitch";
import { useShareDirectorAccessItem } from "@/components/game/useShareDirectorAccessItem";

/**
 * The manage-side header controls for a game header's right-hand slot: a
 * visible "Play" / "Join" button at `sm`+, and a hamburger at every width.
 *
 * The hamburger always carries "Share Director Access"; below `sm` it also
 * carries the same play⇄manage switch (folded in, so exactly one switch
 * appears per breakpoint). The switch's label/target is resolved by
 * {@link PlayManageSwitch} — "Play" to this device's seat when it holds one,
 * otherwise "Join" to take a seat.
 *
 * No director check here: the manage routes are already director-gated by their
 * route guard, so anyone seeing this header is a director.
 */
export function ManageHeaderSwitch({ gameId }: { gameId: string }) {
  const switchItem = usePlayManageSwitchItem(gameId, "toPlay");
  const shareItem = useShareDirectorAccessItem(gameId);

  return (
    <span className="flex items-center gap-2">
      <PlayManageSwitch gameId={gameId} direction="toPlay" />
      <HeaderMenu
        items={[{ ...switchItem, className: "sm:hidden" }, shareItem]}
        label="Menu"
      />
    </span>
  );
}
