import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { teamsGame4Tables } from "@/mocks/fixtures/game";
import {
  RoundResultsPage,
  RoundBoardResult,
} from "@/app/game/[gameId]/play/[initialSeat]/RoundResultsPage";
import {
  buildTeamBoardResultTable,
  TeamBoardResultLine,
} from "@/scoring/swiss/team-board-result-view";

const meta: Meta<typeof RoundResultsPage> = {
  title: "App/Play/Game/Assignment/RoundResultsPage",
  component: RoundResultsPage,
  // GamePageLayout's header reads the game from context and uses the app router.
  decorators: [withGame(teamsGame4Tables)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/play/abc123/A1NS" },
    },
  },
  tags: ["autodocs"],
  args: { onContinue: fn() },
};

export default meta;
type Story = StoryObj<typeof RoundResultsPage>;

/** A team match on one board: table 1 (team A1) vs table 2 (team A2). */
function match(
  boardNumber: number,
  t1Result: string | null,
  t2Result: string | null,
): TeamBoardResultLine[] {
  return [
    { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: t1Result as never },
    { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: t2Result as never },
  ];
}

/** One board's Team Result table from team A1's (table 1) perspective. */
function boardResult(
  boardNumber: number,
  t1Result: string | null,
  t2Result: string | null,
): RoundBoardResult {
  return {
    boardNumber,
    table: buildTeamBoardResultTable(
      match(boardNumber, t1Result, t2Result),
      boardNumber,
      "A1NS",
    ),
  };
}

/** A finished round: a gain, a flat board, and a loss. */
export const Default: Story = {
  args: {
    results: [
      boardResult(1, "3NTN+1", "3NTN="), // +1 IMP to A1
      boardResult(2, "4SN=", "4SN="), // flat
      boardResult(3, "4HE=", "3HE+1"), // A1 loses on this board
    ],
  },
};

/** Some boards not yet comparable (the other room hasn't entered a result). */
export const PartiallyComparable: Story = {
  args: {
    results: [
      boardResult(1, "3NTN+1", "3NTN="),
      boardResult(2, "4SN=", null), // other room pending → no IMP figure
      { boardNumber: 3, table: null }, // nothing comparable at all
    ],
  },
};

/** Still loading the round's results. */
export const Loading: Story = {
  args: { results: null },
};
