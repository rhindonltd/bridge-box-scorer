import { useState } from "react";
import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame, teamsGame4Tables } from "@/mocks/fixtures/game";
import { buildTeamBoardResultTable } from "@/scoring/swiss/team-board-result-view";
import { storyPlayHeader } from "@storybook/decorators/PlayHeaderDecorator";

const meta: Meta<typeof BoardResultsPage> = {
  title: "App/Play/Game/Assignment/BoardResultsPage",
  component: BoardResultsPage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: { headerRight: storyPlayHeader() },
};

export default meta;
type Story = StoryObj<typeof BoardResultsPage>;

export const PairXIMP: Story = {
  decorators: [
    withGame(mockGame),
    withAssignment({
      type: "PAIR",
      id: "3:2",
    }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredBoard: scoreBoard(impBoard1, "XIMP"),
  },
};

export const PairMP: Story = {
  decorators: [
    withGame(mockGame),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredBoard: scoreBoard(mpBoard1, "MP"),
  },
};

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const sampleDeal = {
  N: RANKS.map((r) => `S${r}`),
  E: RANKS.map((r) => `H${r}`),
  S: RANKS.map((r) => `D${r}`),
  W: RANKS.map((r) => `C${r}`),
} as never;

/**
 * When a deal has been entered for the board, the play flow adds a
 * "Results / Deal" choice to the header menu so the player can switch the main
 * view between the traveller and the hand diagram.
 *
 * This story reproduces that wiring (the `showDeal` state + the header menu
 * items live in the play flow, not in the presentational `BoardResultsPage`),
 * so opening the header hamburger shows the real menu — Results / Deal plus
 * Change device / Pair details — and selecting an option switches the view,
 * exactly as the user sees it.
 */
export const PairMPWithDeal: Story = {
  decorators: [
    withGame(mockGame),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredBoard: scoreBoard(mpBoard1, "MP"),
    deal: sampleDeal,
  },
  render: (args) => {
    // Mirror PlayStateRouter: own the Results/Deal choice and feed it both to
    // the page (showDeal) and the header menu (extraItems).
    const [showDeal, setShowDeal] = useState(false);
    const headerRight = storyPlayHeader("A1NS", [
      { label: "Results", active: !showDeal, onSelect: () => setShowDeal(false) },
      { label: "Deal", active: showDeal, onSelect: () => setShowDeal(true) },
    ]);
    return (
      <BoardResultsPage {...args} showDeal={showDeal} headerRight={headerRight} />
    );
  },
};

/**
 * A Teams board: the results area gains an X-IMP / Team Result toggle. X-IMP
 * (default) shows the field-wide cross-IMP traveller; Team Result shows this
 * table vs the other room with the net IMPs to the team. Here team A1 (table 1)
 * made 3NT+1 (+430) while the other room made 3NT= (+400): +1 IMP to A1.
 *
 * The traveller and the assignment share the same team seat ids (A1NS plays at
 * table 1), so the viewing pair's row is highlighted on the X-IMP tab — matching
 * the live app, where the pooled traveller and the seat use one seat scheme.
 */
const teamsBoard1: typeof impBoard1 = {
  type: "PAIR",
  mode: "PAIR",
  board: 1,
  section: "A",
  lines: [
    { nsId: "A1NS", ewId: "A2EW", outcome: "3NTN+1" },
    { nsId: "A2NS", ewId: "A1EW", outcome: "3NTN=" },
  ],
} as typeof impBoard1;

export const TeamsBoard: Story = {
  decorators: [
    withGame(teamsGame4Tables),
    withAssignment({ type: "TEAM", id: "A1NS" }),
  ],
  args: {
    board: 1,
    lastBoardOfRound: false,
    scoredBoard: scoreBoard(teamsBoard1, "XIMP"),
    teamResultTable: buildTeamBoardResultTable(
      [
        { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: "3NTN+1" as never },
        { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: "3NTN=" as never },
      ],
      1,
      "A1NS",
    ),
  },
};
