import { PlayContext } from "@/context/PlayContext";
import { BoardSelection, RoundSelection } from "../../src/context/PlayContext";

export const withPlay =
  (boardSelection: BoardSelection, roundSelection: RoundSelection) =>
  (Story: any) => (
    <PlayContext.Provider
      value={{
        boardSelection,
        selectBoard: () => {},
        clearBoard: () => {},
        roundSelection,
        selectRound: () => {},
        clearRound: () => {},
      }}
    >
      <Story />
    </PlayContext.Provider>
  );
