import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { score } from "@/scoring/traveller/score-traveller";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

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
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(impBoard1, "XIMP"),
    playedBoards: [5],
  },
};

export const PairMP: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(mpBoard1, "MP"),
    playedBoards: [4, 5, 6],
  },
};
