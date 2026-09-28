"use client";

import { useRouter } from "next/navigation";
import { usePlayerSeat } from "@/hooks/use-player-seat";
import type { HeaderMenuItem } from "@/components/layout/HeaderMenu";

/**
 * Which way this switch takes the user:
 *  - "toManage": from a play screen to the manage menu.
 *  - "toPlay":   from a manage screen to this device's seat (Play), or to the
 *    join flow (Join) when the device is not seated.
 */
export type SwitchDirection = "toManage" | "toPlay";

interface Resolved {
  label: string;
  href: string;
}

/**
 * Resolve the switch's label and destination. `toManage` always lands on the
 * manage menu. `toPlay` goes to the device's own seat when it holds one
 * ("Play"), otherwise to the join flow so an unseated director can take a seat
 * ("Join").
 */
function resolveSwitch(
  gameId: string,
  direction: SwitchDirection,
  seat: string | null,
): Resolved {
  if (direction === "toManage") {
    return { label: "Manage", href: `/game/${gameId}/manage` };
  }
  return seat
    ? { label: "Play", href: `/game/${gameId}/play/${seat}` }
    : { label: "Join", href: `/game/${gameId}/join` };
}

/**
 * A menu-item form of the switch, for the folded (small-screen) case — e.g. the
 * play header's hamburger. Shares {@link resolveSwitch} so the label/target
 * match the visible button exactly. Must be called from a client component
 * (uses the router and reads the seat token).
 */
export function usePlayManageSwitchItem(
  gameId: string,
  direction: SwitchDirection,
): HeaderMenuItem {
  const router = useRouter();
  const seat = usePlayerSeat(gameId);
  const { label, href } = resolveSwitch(gameId, direction, seat);
  return { label, onSelect: () => router.push(href) };
}

interface Props {
  gameId: string;
  direction: SwitchDirection;
}

/**
 * The visible play⇄manage switch: a compact destination button for the header
 * (a director device only). Shown from the `sm` breakpoint up (`hidden
 * sm:inline-flex`); below `sm` the same action is offered as a hamburger menu
 * item via {@link usePlayManageSwitchItem}, so exactly one appears per
 * breakpoint.
 *
 * Gating (whether this device is a director) is the caller's responsibility:
 * play screens render it only for directors; the manage screens are already
 * director-gated by their route guard.
 */
export function PlayManageSwitch({ gameId, direction }: Props) {
  const router = useRouter();
  const seat = usePlayerSeat(gameId);
  const { label, href } = resolveSwitch(gameId, direction, seat);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="hidden sm:inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {label}
    </button>
  );
}
