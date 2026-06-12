import { GameContext } from "@/context/GameContext";
import { BridgeGame } from "@/db/game-index/schema";

export const withGame =
  (game: BridgeGame, isLoading: boolean = false) =>
  (Story: any) => (
    <GameContext.Provider
      value={{
        game,
        isLoading,
        mutateGame: () => {},
      }}
    >
      <Story />
    </GameContext.Provider>
  );
