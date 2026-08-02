import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TravellerView } from "./TravellerView";

const meta: Meta<typeof TravellerView> = {
  title: "Pages/Manage/Travellers/TravellerView",
  component: TravellerView,
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
type Story = StoryObj<typeof TravellerView>;

export const PairsWithNames: Story = {
  args: {
    boardNumber: 7,
    isLoading: false,
    gameType: "PAIRS",
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "1NS",
          ew: "4EW",
          nsNames: "Steven Leung & Colin Holehouse",
          ewNames: "Srimath Agalawatte & Rachel Thomas",
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
          nsNames: "Roy Button & Nadia Button",
          ewNames: "Bobbie Rodney & Maria Budd",
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
          nsNames: "Piers Fuller & Sally Bennett",
          ewNames: "Steven Leung & Colin Holehouse",
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
          nsNames: "Bobbie Rodney & Maria Budd",
          ewNames: "Piers Fuller & Sally Bennett",
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
    gameType: "PAIRS",
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
    gameType: "PAIRS",
    instances: [],
  },
};

export const Loading: Story = {
  args: {
    boardNumber: 5,
    isLoading: true,
    gameType: "PAIRS",
    instances: [],
  },
};
