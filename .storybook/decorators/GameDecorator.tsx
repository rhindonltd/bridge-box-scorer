import { GameContext } from "@/context/GameContext";

export const withGame = (gameSelection?: any, assignmentSelection?: any) => (Story: any) => (
  <GameContext.Provider
    value={{ gameSelection, selectGame: () => {}, clearGame: () => {},
        assignmentSelection, selectAssignment: () => {}, clearAssignment: () => {} }}
  >
    <Story />
  </GameContext.Provider>
);
