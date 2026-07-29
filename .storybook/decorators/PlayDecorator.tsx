import React from "react";
import { PlayContext } from "@/context/PlayContext";
import { BoardSelection, RoundSelection } from "../../src/context/PlayContext";

export const withPlay = (
  boardSelection: BoardSelection,
  roundSelection: RoundSelection,
) => {
  function PlayDecorator(Story: React.ComponentType) {
    return (
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
  }
  PlayDecorator.displayName = "PlayDecorator";
  return PlayDecorator;
};
