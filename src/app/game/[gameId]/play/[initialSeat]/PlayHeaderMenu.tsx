"use client";

import { useState } from "react";

import { HeaderMenu, type HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { useAssignment } from "@/context/AssignmentContext";
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

  const [changeDeviceOpen, setChangeDeviceOpen] = useState(false);
  const [pairDetailsOpen, setPairDetailsOpen] = useState(false);

  const items: HeaderMenuItem[] = [
    { label: "Change device", onSelect: () => setChangeDeviceOpen(true) },
    { label: "Pair details", onSelect: () => setPairDetailsOpen(true) },
    // Future items (e.g. "Call director") go here.
  ];

  return (
    <>
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
    </>
  );
}
