"use server";

import { GameDetails } from "@/components/create/SimpleCreateGameForm";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";

export async function createGame(gameDetails: GameDetails) {
  const gameId = await createBridgeGame({
    eventName: gameDetails.eventName,
    director: gameDetails.director,
    eventType: gameDetails.eventType,
    sessionName: "",
    eventDate: new Date().toISOString(),
    sectionName: "",
  });

  await createGameDb(gameId, gameDetails.eventType);

  return gameId;
}
