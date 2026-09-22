import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame, teamsGame4Tables } from "@/mocks/fixtures/game";
import { buildTeamBoardResultTable } from "@/scoring/swiss/team-board-result-view";

const meta: Meta<typeof BoardResultsPage> = {
  title: "App/Play/Game/Assignment/BoardResultsPage",
  component: BoardResultsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
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
    playedBoards: [5],
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
    playedBoards: [4, 5, 6],
  },
};

/**
 * A Teams board: the results area gains an X-IMP / Team Result toggle. X-IMP
 * (default) shows the field-wide cross-IMP traveller; Team Result shows this
 * table vs the other room with the net IMPs to the team. Here team A1 (table 1)
 * made 3NT+1 (+430) while the other room made 3NT= (+400): +1 IMP to A1.
 */
export const TeamsBoard: Story = {
  decorators: [
    withGame(teamsGame4Tables),
    withAssignment({ type: "TEAM", id: "A1NS" }),
  ],
  args: {
    board: 1,
    lastBoardOfRound: false,
    scoredBoard: scoreBoard(impBoard1, "XIMP"),
    teamResultTable: buildTeamBoardResultTable(
      [
        { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: "3NTN+1" as never },
        { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: "3NTN=" as never },
      ],
      1,
      "A1NS",
    ),
    playedBoards: [1],
  },
};
