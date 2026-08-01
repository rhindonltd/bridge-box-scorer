import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SelectInstancePage } from "./SelectInstancePage";
import { withGame } from "@storybook/decorators/GameDecorator";

const mockGame = {
  id: 1,
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  gameId: "abc123",
  sessionName: "Session 1",
  sectionName: "Section A",
  eventDate: new Date().toISOString(),
  tables: 8,
  status: "JOINABLE" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof SelectInstancePage> = {
  title: "Pages/Manage/CorrectResult/SelectInstancePage",
  component: SelectInstancePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onInstanceSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SelectInstancePage>;

export const PairsInstances: Story = {
  args: {
    boardNumber: 7,
    isLoading: false,
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 7,
        participants: { type: "PAIRS", ns: "1NS", ew: "4EW" },
        currentResult: "3NTN=",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 3,
        boardNumber: 7,
        participants: { type: "PAIRS", ns: "3NS", ew: "2EW" },
        currentResult: null,
        status: null,
      },
      {
        roundNumber: 3,
        tableNumber: 2,
        boardNumber: 7,
        participants: { type: "PAIRS", ns: "2NS", ew: "1EW" },
        currentResult: "4HE+1",
        status: "OVERRIDDEN",
      },
    ],
  },
};

export const Empty: Story = {
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
