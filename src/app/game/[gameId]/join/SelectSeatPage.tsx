"use client";

import { useRequiredGame } from "@/context/GameContext";
import { Pair, PairSeat, parseSeat, Seat } from "@/model/participants";
import { isSeatInSections } from "@/model/section";
import { useState } from "react";
import EnterPlayerNames from "@/app/game/[gameId]/join/EnterPlayerNames";
import { swrKeys } from "@/swr/swr-keys";
import { fetcher } from "@/lib/fetcher";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { SocketEvents } from "@/socket/socket-events";
import useSWR from "swr";
import { NewPlayer } from "@/db/games/tables/players";
import { createParticipant } from "@/lib/game-service";
import SelectTable from "@/app/game/[gameId]/join/SelectTable";
import { ClaimSeatTransfer } from "@/app/game/[gameId]/join/ClaimSeatTransfer";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useSections } from "@/hooks/sections";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectSeatPage({ onSeatSelected }: Props) {
  const { game } = useRequiredGame();

  const gameId = game.gameId;

  const [selectedSeat, setSelectedSeat] = useState<PairSeat | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // True from the moment a pair is submitted until the device navigates away.
  // While submitting we hide the name sheet, so the live participants list —
  // which the server updates to INCLUDE the just-seated pair — can't make the
  // sheet briefly flag the player's own pair as "already seated" before the
  // play screen loads. Reset on failure so the sheet returns with the error.
  const [submitting, setSubmitting] = useState(false);

  const key = swrKeys.pairs(gameId);

  const pairsFetcher = async (url: string): Promise<Pair[]> => {
    const response: { pairs: Pair[] } = await fetcher(url);

    return response.pairs;
  };

  const { data } = useSWR<Pair[], Error>(key, pairsFetcher);
  const { sections } = useSections(gameId);

  // EBU numbers already seated anywhere in the event. Derived from the same
  // live pairs list the seat grid uses, so the name panel can flag a clash the
  // instant a match is chosen from the search — the server still enforces this
  // on submit as the authority (it also covers races from other devices).
  const seatedNationalIds = new Set<string>();
  for (const pair of data ?? []) {
    if (pair.player1?.nationalId) seatedNationalIds.add(pair.player1.nationalId);
    if (pair.player2?.nationalId) seatedNationalIds.add(pair.player2.nationalId);
  }

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
    }),
    [gameId],
  );

  // The section layout is live (a director can split/resize sections while a
  // player is mid-pick). If the seat chosen in the open name sheet is no longer
  // a real table in the current layout — e.g. a split renumbered it away — we
  // must not let the player submit a seat the server will now reject. Derive
  // that invalidity during render (rather than mutating state in an effect):
  // when the selected seat is no longer valid we hide the sheet and show a
  // "pick again" notice, and the next pick replaces the stale selection. Only
  // applies once sections are known, so the brief pre-load (empty list) never
  // hides a valid selection.
  const selectionInvalidated =
    selectedSeat !== null &&
    sections.length > 0 &&
    !isSeatInSections(selectedSeat, sections);

  // The sheet is only "really" open for a seat that still exists AND while we
  // are not mid-submit (see `submitting`).
  const activeSeat = selectionInvalidated || submitting ? null : selectedSeat;

  const handleSeatSelected = (seat: PairSeat) => {
    setSubmitError(null);
    setSelectedSeat(seat);
  };

  // A team name is only relevant for a Teams event, and only for the home (NS)
  // pair (a team is named by its home NS pair; the away EW pair does not name
  // it). Teams is currently always Swiss Teams, so the game-level type is the
  // signal — no need to inspect per-section movement here.
  const isTeamsEvent = game.gameType === "TEAMS";
  const isTeamsNsSeat =
    isTeamsEvent &&
    activeSeat !== null &&
    parseSeat(activeSeat).direction === "NS";

  async function handlePairSubmitted(
    player1: NewPlayer,
    player2: NewPlayer,
    teamName?: string,
  ) {
    // The sheet only renders for a still-valid `activeSeat`, so this is always
    // a real seat; guard defensively regardless. Capture the seat and the
    // teams flag up front, since flipping `submitting` below clears
    // `activeSeat` (the sheet closes) for the rest of this async call.
    /* v8 ignore next -- unreachable: the sheet (the only caller) renders only while activeSeat is set. */
    if (!activeSeat) return;
    const seat = activeSeat;
    const forwardTeamName = isTeamsNsSeat ? teamName : undefined;

    setSubmitError(null);
    setSubmitting(true);
    try {
      await createParticipant(
        gameId,
        {
          type: "PAIR",
          initialSeat: seat,
          player1,
          player2,
        },
        forwardTeamName,
      );
      onSeatSelected(seat);
    } catch (err) {
      // e.g. an EBU number already seated elsewhere in the event. Reopen the
      // sheet (with the error) so the entry can be corrected.
      setSubmitting(false);
      setSubmitError(
        err instanceof Error ? err.message : "Could not seat this pair.",
      );
    }
  }

  return (
    <GamePageLayout headerTitle="Select Seat">
      <>
        {/* Take over a seat already entered on another device. Pinned at the
            top (under the header, above the table list) like the director's
            movement banner, so it is visible without scrolling. */}
        <div className="flex shrink-0 justify-center border-b border-yellow-300 bg-yellow-50 px-4 py-3">
          <ClaimSeatTransfer />
        </div>

        {/* A live layout change (e.g. a section split) invalidated the seat the
            player was mid-way through claiming. The sheet is hidden (its seat
            no longer exists); prompt them to pick again. */}
        {selectionInvalidated && (
          <div
            role="alert"
            className="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
          >
            That table was just reorganised by the director. Please pick a seat
            again.
          </div>
        )}

        {/* Main table selection */}
        <SelectTable
          onSeatSelected={handleSeatSelected}
          sections={sections}
          startingPositions={data ?? []}
        />

        {/* Backdrop */}
        {activeSeat && (
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSelectedSeat(null)}
          />
        )}

        {/* Bottom sheet */}
        <div
          className={`
                    fixed bottom-0 left-0 right-0
                    bg-white
                    shadow-2xl
                    rounded-t-2xl
                    transform
                    transition-transform duration-300 ease-out
                    ${activeSeat ? "translate-y-0" : "translate-y-full"}
                  `}
        >
          {activeSeat && (
            <>
              {submitError && (
                <div role="alert" className="mx-auto mt-4 w-full max-w-xl px-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                    {submitError}
                  </div>
                </div>
              )}
              <EnterPlayerNames
                seat={activeSeat}
                showTeamName={isTeamsNsSeat}
                seatedNationalIds={seatedNationalIds}
                onSubmitPair={handlePairSubmitted}
              />
            </>
          )}
        </div>
      </>
    </GamePageLayout>
  );
}
