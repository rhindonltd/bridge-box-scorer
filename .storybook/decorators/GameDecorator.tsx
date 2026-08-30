import React from "react";
import { GameContext } from "@/context/GameContext";
import { BridgeGame } from "@/db/game-index/schema";
import { KeyedMutator } from "swr";

export const mockMutateGame: KeyedMutator<BridgeGame> = async () => {
  return undefined;
};

export const withGame = (game: BridgeGame, isLoading: boolean = false) => {
  function GameDecorator(Story: React.ComponentType) {
    return (
      <GameContext.Provider
        value={{ game, isLoading, mutateGame: mockMutateGame }}
      >
        <Story />
      </GameContext.Provider>
    );
  }
  GameDecorator.displayName = "GameDecorator";
  return GameDecorator;
};
