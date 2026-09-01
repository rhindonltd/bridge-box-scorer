import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame } from "@/mocks/fixtures/game";

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
