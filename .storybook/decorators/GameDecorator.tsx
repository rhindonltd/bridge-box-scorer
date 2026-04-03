import { GameContext } from "../../src/context/GameSelectionContext";

export const withGame = (selection: any) => (Story: any) => (
  <GameContext.Provider
    value={{ selection, selectGame: () => {}, clearSelection: () => {} }}
  >
    <Story />
  </GameContext.Provider>
);
