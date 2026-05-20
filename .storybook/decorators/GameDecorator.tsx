import { GameContext, GameSelection } from "@/context/GameContext";

export const withGame = (gameSelection: GameSelection) => (Story: any) => (
  <GameContext.Provider
    value={{
      gameSelection,
      selectGame: () => {},
      clearGame: () => {},
    }}
  >
    <Story />
  </GameContext.Provider>
);
