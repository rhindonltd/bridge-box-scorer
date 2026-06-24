import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/components/pages/play/BoardResultsPage";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { score } from "@/scoring/traveller/score-traveller";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof BoardResultsPage> = {
  title: "Pages/Play/BoardResultsPage",
  component: BoardResultsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BoardResultsPage>;

export const IndividualXIMP: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
      withAssignment({
          type: "PAIR",
          player1: {
              id: 1,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
          },
          player2: {
              id: 2,
              firstName: "David",
              lastName: "Collier",
              nationalId: "404476",
          },
          tableNumber: 3,
          direction: "EW",
          pairId: "1",
      }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualIMPTraveller,
  },
};

export const IndividualMP: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
      withAssignment({
          type: "INDIVIDUAL",
          player: {
              id: 1,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
          },
          tableNumber: 3,
          direction: "E",
          playerId: "12",
      }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualMpTraveller,
  },
};

export const PairXIMP: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
      withAssignment({
          type: "PAIR",
          player1: {
              id: 1,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
          },
          player2: {
              id: 2,
              firstName: "David",
              lastName: "Collier",
              nationalId: "404476",
          },
          tableNumber: 3,
          direction: "EW",
          pairId: "1",
      }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(impBoard1, "XIMP"),
  },
};

export const PairMP: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
      withAssignment({
          type: "PAIR",
          player1: {
              id: 1,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
          },
          player2: {
              id: 2,
              firstName: "David",
              lastName: "Collier",
              nationalId: "404476",
          },
          tableNumber: 3,
          direction: "EW",
          pairId: "1",
      }),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(mpBoard1, "MP"),
  },
};
