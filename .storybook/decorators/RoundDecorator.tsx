import { RoundContext } from "@/context/RoundSelectionContext";

export const withRound = (selection: any) => (Story: any) => (
    <RoundContext.Provider
        value={{ selection, selectRound: () => {}, clearSelection: () => {} }}
    >
        <Story />
    </RoundContext.Provider>
);
