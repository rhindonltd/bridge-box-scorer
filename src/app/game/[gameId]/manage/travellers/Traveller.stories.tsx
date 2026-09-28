import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Traveller } from "@/app/game/[gameId]/manage/travellers/Traveller";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof Traveller> = {
  title: "App/Manage/Game/CorrectResult/Traveller",
  component: Traveller,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLineSelected: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Traveller>;

export const PairsWithNames: Story = {
  args: {
    boardNumber: 7,
    isLoading: false,
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "1NS",
          ew: "4EW",
          nsNames: "Alex Morgan & Chris Palmer",
          ewNames: "Dana Rivers & Robin Shaw",
        },
        currentResult: "3NTN=",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 2,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "2NS",
          ew: "5EW",
          nsNames: "Sam Carter & Nina Carter",
          ewNames: "Jordan Blake & Mia Fox",
        },
        currentResult: "4HE+1",
        status: "CONFIRMED",
      },
      {
        roundNumber: 3,
        tableNumber: 3,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "3NS",
          ew: "1EW",
          nsNames: "Oliver Reed & Sophie Bell",
          ewNames: "Alex Morgan & Chris Palmer",
        },
        currentResult: null,
        status: null,
      },
      {
        roundNumber: 4,
        tableNumber: 4,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "5NS",
          ew: "3EW",
          nsNames: "Jordan Blake & Mia Fox",
          ewNames: "Oliver Reed & Sophie Bell",
        },
        currentResult: "2SXE-2",
        status: "OVERRIDDEN",
      },
    ],
  },
};

export const PairsWithoutNames: Story = {
  args: {
    boardNumber: 3,
    isLoading: false,
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "1NS",
          ew: "2EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "3NTW+1",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 2,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "3NS",
          ew: "4EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "PO",
        status: "CONFIRMED",
      },
      {
        roundNumber: 3,
        tableNumber: 3,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "5NS",
          ew: "1EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "NP",
        status: "NOT_PLAYED",
      },
    ],
  },
};

export const NoResults: Story = {
  args: {
    boardNumber: 12,
    isLoading: false,
    instances: [],
  },
};

export const Loading: Story = {
  args: {
    boardNumber: 5,
    isLoading: true,
    instances: [],
  },
};
