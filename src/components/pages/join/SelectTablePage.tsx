"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectTable from "@/components/join/SelectTable";
import { useGame } from "@/context/GameContext";
import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { Direction, PairDirection } from "@/model/common";
import { SocketEvents } from "@/socket/socket-events";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface Props {}

export function SelectTablePage() {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<StartingPositionWithPlayer[], Error>(
    gameId ? `/api/games/${gameId}/starting-positions` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/${gameId}/starting-positions`;

    function handleStartingPositions(payload: {
      startingPositions: StartingPositionWithPlayer[];
    }) {
      console.log("STARTING POS: " + JSON.stringify(payload));

      mutate(key, payload.startingPositions, false);
    }

    socket.on(SocketEvents.STARTING_POSITIONS, handleStartingPositions);

    return () => {
      socket.off(SocketEvents.STARTING_POSITIONS, handleStartingPositions);
    };
  }, [gameId, mutate]);

  function setStartingPositions(
    startingPositionsWithPlayer: StartingPositionWithPlayer[],
  ) {
    getSocket().emit(SocketEvents.SELECT_SEAT, {
      gameId,
      startingPositionsWithPlayer,
    });
  }

  interface AssignedPairs {
    tableNumber: number;
    pairDirection: PairDirection;
  }

  function assignedPairs(): AssignedPairs[] {
    if (!data) {
      return [];
    }

    const grouped = new Map<
      number,
      Partial<Record<Direction, StartingPositionWithPlayer>>
    >();

    // Group by table
    for (const entry of data) {
      if (!grouped.has(entry.tableNumber)) {
        grouped.set(entry.tableNumber, {});
      }

      grouped.get(entry.tableNumber)![entry.direction] = entry;
    }

    const assignedPairs: AssignedPairs[] = [];

    for (const [tableNumber, directions] of grouped) {
      if (directions.N && directions.S) {
        assignedPairs.push({
          tableNumber,
          pairDirection: "NS",
        });
      }

      if (directions.E && directions.W) {
        assignedPairs.push({
          tableNumber,
          pairDirection: "EW",
        });
      }
    }

    return assignedPairs;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectTable
        tables={gameSelection.tables}
        setStartingPositions={setStartingPositions}
        assignedPairs={assignedPairs()}
      />
    </div>
  );
}
