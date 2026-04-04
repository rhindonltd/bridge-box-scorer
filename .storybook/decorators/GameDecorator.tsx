import {
  GameContext,
  GameSelection,
  AssignmentSelection,
} from "@/context/GameContext";

export const withGame =
  (gameSelection: GameSelection, assignmentSelection: AssignmentSelection) =>
  (Story: any) => (
    <GameContext.Provider
      value={{
        gameSelection,
        selectGame: () => {},
        clearGame: () => {},
        assignmentSelection,
        selectAssignment: () => {},
        clearAssignment: () => {},
      }}
    >
      <Story />
    </GameContext.Provider>
  );
