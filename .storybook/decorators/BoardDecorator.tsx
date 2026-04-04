import { BoardContext } from "@/context/BoardSelectionContext";

export const withBoard = (selection: any) => (Story: any) => (
  <BoardContext.Provider
    value={{ selection, selectBoard: () => {}, clearSelection: () => {} }}
  >
    <Story />
  </BoardContext.Provider>
);
