"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";

import {
  HeaderMenu,
  type HeaderMenuItem,
} from "@/components/layout/HeaderMenu";
import { useAssignment } from "@/context/AssignmentContext";
import { GameContext } from "@/context/GameContext";
import { useIsDirector } from "@/hooks/use-is-director";
import { useSections } from "@/hooks/sections";
import { parseSeat } from "@/model/participants";
import {
  PlayManageSwitch,
  usePlayManageSwitchItem,
} from "@/components/game/PlayManageSwitch";
import { useShareDirectorAccessItem } from "@/components/game/useShareDirectorAccessItem";
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
 * right-hand slot and offers the actions available during play: Handover,
 * Withdraw (pairs events), "Change device" (hand this seat to another device)
 * — each its own page — and "Pair details" (this pair's number and players, a
 * dialog). Future actions such as "Call director" slot in as additional
 * {@link HeaderMenuItem}s below.
 *
 * The pair shown in "Pair details" comes from {@link useAssignment}, so it is
 * available in every play state without a per-screen lookup.
 */
export function PlayHeaderMenu({ gameId, seat, extraItems = [] }: Props) {
  const { assignment, pair } = useAssignment();
  const isDirector = useIsDirector(gameId);
  const router = useRouter();
  // Self-service withdrawal (design §11) is for pairs events only (not Swiss,
  // not teams). Read the game without requiring a provider so the menu still
  // renders where none is mounted.
  const game = useContext(GameContext)?.game;
  const canWithdraw =
    game?.gameType === "PAIRS" && game.eventFormat !== "SWISS";
  // The personal Scorecard is for pairs events (incl. Swiss Pairs) only.
  const hasScorecard = game?.gameType === "PAIRS";

  // "Pair details" shows the section only when the game has more than one.
  const { sections } = useSections(gameId);
  const multiSection = sections.length > 1;
  let seatSection: string | null = null;
  try {
    seatSection = parseSeat(seat).section;
  } catch {
    seatSection = null;
  }

  const [pairDetailsOpen, setPairDetailsOpen] = useState(false);

  // The play→manage switch, for a director device. It shows as a visible
  // header button at `sm`+ and folds into this menu below `sm`, so exactly one
  // appears per breakpoint. The hook is called unconditionally (rules of
  // hooks); the resulting item is only added to the menu for a director.
  const manageItem = usePlayManageSwitchItem(gameId, "toManage");
  const shareItem = useShareDirectorAccessItem(gameId);

  const items: HeaderMenuItem[] = [
    // Screen-specific view options (e.g. Results / Deal) come first.
    ...extraItems,
    // The pair's own results so far (pairs events only) — its own page.
    ...(hasScorecard
      ? [
          {
            label: "Scorecard",
            onSelect: () =>
              router.push(`/game/${gameId}/play/${seat}/scorecard`),
          },
        ]
      : []),
    // Read-only info about this pair sits with the Scorecard, apart from the
    // actions below that change or leave the game. It stays a dialog.
    { label: "Pair details", onSelect: () => setPairDetailsOpen(true) },
    // "Handover" is always available mid-game: an arriving pair can take over
    // this seat at any time (a latecomer replacing a stand-in, a substitute
    // replacing a withdrawing pair, …). Whether either pair is "without
    // standing" is a director decision made afterwards on the Substitutions
    // screen — not a precondition for the handover itself.
    {
      label: "Handover",
      onSelect: () => router.push(`/game/${gameId}/play/${seat}/handover`),
    },
    ...(canWithdraw
      ? [
          {
            label: "Withdraw",
            onSelect: () =>
              router.push(`/game/${gameId}/play/${seat}/withdraw`),
          },
        ]
      : []),
    // Actions with steps or a consequence (this device loses the seat) open
    // their own page.
    {
      label: "Change device",
      onSelect: () => router.push(`/game/${gameId}/play/${seat}/change-device`),
    },
    // A director's play→manage switch (folded / small-screen form). The visible
    // form is the `sm`+ button rendered below.
    ...(isDirector ? [{ ...manageItem, className: "sm:hidden" }] : []),
    // Director-only: hand a co-director a share code from wherever you are.
    ...(isDirector ? [shareItem] : []),
    // Future items (e.g. "Call director") go here.
  ];

  return (
    <span className="flex items-center gap-2">
      {isDirector && <PlayManageSwitch gameId={gameId} direction="toManage" />}

      <HeaderMenu items={items} label="Menu" />

      <PairDetailsDialog
        open={pairDetailsOpen}
        onOpenChange={setPairDetailsOpen}
        pair={pair}
        pairId={assignment?.id ?? null}
        section={multiSection ? seatSection : null}
      />
    </span>
  );
}
