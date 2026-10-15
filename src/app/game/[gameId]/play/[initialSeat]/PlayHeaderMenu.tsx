"use client";

import { useMemo, useState } from "react";

import { HeaderMenu, type HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { useAssignment } from "@/context/AssignmentContext";
import { useGame } from "@/context/GameContext";
import { useSections } from "@/hooks/sections";
import { useIsDirector } from "@/hooks/use-is-director";
import { parseSeat } from "@/model/participants";
import { isTwoWinnerPairs } from "@/model/event-format";
import {
  PlayManageSwitch,
  usePlayManageSwitchItem,
} from "@/components/game/PlayManageSwitch";
import { ChangeDeviceButton } from "./ChangeDeviceButton";
import { PairDetailsDialog } from "./PairDetailsDialog";

interface Props {
  gameId: string;
  /** The seat this device holds (section-qualified, e.g. "A3NS"). */
  seat: string;
  /**
   * Screen-specific entries added to the top of the menu, above the shared play
   * actions. Used by a screen that has its own view options — e.g. the board
   * results screen contributes its "Results / Deal" choice here.
   */
  extraItems?: HeaderMenuItem[];
}

/**
 * The shared play-header hamburger menu. Sits in each play screen's header
 * right-hand slot and offers the actions available during play. Today that is
 * "Change device" (hand this seat to another device) and "Pair details" (this
 * pair's number and players). Future actions such as "Call director" slot in as
 * additional {@link HeaderMenuItem}s below.
 *
 * The pair shown in "Pair details" comes from {@link useAssignment}, so it is
 * available in every play state without a per-screen lookup.
 */
export function PlayHeaderMenu({ gameId, seat, extraItems = [] }: Props) {
  const { pair } = useAssignment();
  const { game } = useGame();
  const { sections } = useSections(gameId);
  const isDirector = useIsDirector(gameId);

  const [changeDeviceOpen, setChangeDeviceOpen] = useState(false);
  const [pairDetailsOpen, setPairDetailsOpen] = useState(false);

  // Section + pair labels for the Pair Details dialog, derived from this seat.
  // The section is hidden for a single-section game (it is redundant there).
  // The pair number keeps its NS/EW direction for a two-winner (Mitchell) or
  // teams game — where the two directions are distinct contestants — and drops
  // it for a one-winner game, where only the table number identifies the pair.
  const { section, pairLabel } = useMemo(() => {
    let parsed: ReturnType<typeof parseSeat>;
    try {
      parsed = parseSeat(seat);
    } catch {
      return { section: null, pairLabel: null };
    }

    const multiSection = sections.length > 1;

    // Two-winner is a pairs-only concept; teams and one-winner pairs are not
    // two-winner. Teams, like two-winner pairs, keep the direction so a team's
    // two pairs stay distinguishable.
    const sectionMovement =
      sections.find((s) => s.section === parsed.section)?.selectedMovement ??
      null;
    const keepDirection =
      game == null ||
      game.gameType === "TEAMS" ||
      isTwoWinnerPairs(game.gameType, sectionMovement);

    return {
      section: multiSection ? parsed.section : null,
      pairLabel: keepDirection
        ? `${parsed.tableNumber}${parsed.direction}`
        : `${parsed.tableNumber}`,
    };
  }, [seat, sections, game]);

  // The play→manage switch, for a director device. It shows as a visible
  // header button at `sm`+ and folds into this menu below `sm`, so exactly one
  // appears per breakpoint. The hook is called unconditionally (rules of
  // hooks); the resulting item is only added to the menu for a director.
  const manageItem = usePlayManageSwitchItem(gameId, "toManage");

  const items: HeaderMenuItem[] = [
    // Screen-specific view options (e.g. Results / Deal) come first.
    ...extraItems,
    { label: "Change device", onSelect: () => setChangeDeviceOpen(true) },
    { label: "Pair details", onSelect: () => setPairDetailsOpen(true) },
    // A director's play→manage switch (folded / small-screen form). The visible
    // form is the `sm`+ button rendered below.
    ...(isDirector ? [{ ...manageItem, className: "sm:hidden" }] : []),
    // Future items (e.g. "Call director") go here.
  ];

  return (
    <span className="flex items-center gap-2">
      {isDirector && <PlayManageSwitch gameId={gameId} direction="toManage" />}

      <HeaderMenu items={items} label="Menu" />

      <ChangeDeviceButton
        gameId={gameId}
        seat={seat}
        variant="none"
        open={changeDeviceOpen}
        onOpenChange={setChangeDeviceOpen}
      />

      <PairDetailsDialog
        open={pairDetailsOpen}
        onOpenChange={setPairDetailsOpen}
        pair={pair}
        section={section}
        pairLabel={pairLabel}
      />
    </span>
  );
}
