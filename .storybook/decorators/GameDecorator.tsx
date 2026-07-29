import React from "react";
import { GameContext } from "@/context/GameContext";
import { BridgeGame } from "@/db/game-index/schema";

export const withGame = (game: BridgeGame, isLoading: boolean = false) => {
  function GameDecorator(Story: React.ComponentType) {
    return (
      <GameContext.Provider
        value={{ game, isLoading, mutateGame: () => {} }}
      >
        <Story />
      </GameContext.Provider>
    );
  }
  GameDecorator.displayName = "GameDecorator";
  return GameDecorator;
};
