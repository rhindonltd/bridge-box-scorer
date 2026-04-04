import { PlayContext } from "@/context/PlayContext";

export const withPlay = (boardSelection: any, roundSelection: any) => (Story: any) => (
  <PlayContext.Provider
    value={{ boardSelection, selectBoard: () => {}, clearBoard: () => {},
        roundSelection, selectRound: () => {}, clearRound: () => {} }}
  >
    <Story />
  </PlayContext.Provider>
);
