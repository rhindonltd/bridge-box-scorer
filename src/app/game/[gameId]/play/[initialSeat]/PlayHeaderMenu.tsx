"use client";

import { useState } from "react";

import { HeaderMenu, type HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { useAssignment } from "@/context/AssignmentContext";
import { useIsDirector } from "@/hooks/use-is-director";
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
export function PlayHeaderMenu({ gameId, seat }: Props) {
  const { assignment, pair } = useAssignment();
  const isDirector = useIsDirector(gameId);

  const [changeDeviceOpen, setChangeDeviceOpen] = useState(false);
  const [pairDetailsOpen, setPairDetailsOpen] = useState(false);

  // The play→manage switch, for a director device. It shows as a visible
  // header button at `sm`+ and folds into this menu below `sm`, so exactly one
  // appears per breakpoint. The hook is called unconditionally (rules of
  // hooks); the resulting item is only added to the menu for a director.
  const manageItem = usePlayManageSwitchItem(gameId, "toManage");

  const items: HeaderMenuItem[] = [
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
        pairId={assignment?.id ?? null}
      />
    </span>
  );
}
