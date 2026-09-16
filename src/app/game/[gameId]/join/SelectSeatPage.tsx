"use client";

import { useRequiredGame } from "@/context/GameContext";
import { Pair, PairSeat, parseSeat, Seat } from "@/model/participants";
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

  const key = swrKeys.pairs(gameId);

  const pairsFetcher = async (url: string): Promise<Pair[]> => {
    const response: { pairs: Pair[] } = await fetcher(url);

    return response.pairs;
  };

  const { data } = useSWR<Pair[], Error>(key, pairsFetcher);
  const { sections } = useSections(gameId);

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
    }),
    [gameId],
  );

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
    selectedSeat !== null &&
    parseSeat(selectedSeat).direction === "NS";

  async function handlePairSubmitted(
    player1: NewPlayer,
    player2: NewPlayer,
    teamName?: string,
  ) {
    setSubmitError(null);
    try {
      await createParticipant(
        gameId,
        {
          type: "PAIR",
          initialSeat: selectedSeat!,
          player1,
          player2,
        },
        isTeamsNsSeat ? teamName : undefined,
      );
      onSeatSelected(selectedSeat!);
    } catch (err) {
      // e.g. an EBU number already seated elsewhere in the event. Keep the
      // sheet open so the entry can be corrected.
      setSubmitError(
        err instanceof Error ? err.message : "Could not seat this pair.",
      );
    }
  }

  return (
    <GamePageLayout headerTitle="Select Seat">
      <>
        {/* Main table selection */}
        <SelectTable
          onSeatSelected={handleSeatSelected}
          sections={sections}
          startingPositions={data ?? []}
        />

        {/* Take over a seat already entered on another device. */}
        <div className="mt-6 flex justify-center">
          <ClaimSeatTransfer />
        </div>

        {/* Backdrop */}
        {selectedSeat && (
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
                    ${selectedSeat ? "translate-y-0" : "translate-y-full"}
                  `}
        >
          {selectedSeat && (
            <>
              {submitError && (
                <div role="alert" className="mx-auto mt-4 w-full max-w-xl px-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                    {submitError}
                  </div>
                </div>
              )}
              <EnterPlayerNames
                seat={selectedSeat}
                showTeamName={isTeamsNsSeat}
                onSubmitPair={handlePairSubmitted}
              />
            </>
          )}
        </div>
      </>
    </GamePageLayout>
  );
}
