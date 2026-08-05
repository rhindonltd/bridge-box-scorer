import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageGameList } from "./ManageGameList";

const meta: Meta<typeof ManageGameList> = {
  title: "Pages/Manage/ManageGameList",
  component: ManageGameList,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onGameSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ManageGameList>;

export const WithGames: Story = {
  args: {
    isLoading: false,
    games: [
      {
        id: 1,
        eventName: "Monday AM Pairs",
        director: "Jacqui Collier",
        gameType: "PAIRS",
        scoringType: "MP",
        gameId: "abc123",
        sessionName: "Session 1",
        sectionName: "Section A",
        eventDate: new Date().toISOString(),
        tables: 8,
        leadCardRequired: true,
        status: "JOINABLE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        eventName: "Tuesday PM Individual",
        director: "David Collier",
        gameType: "PAIRS",
        scoringType: "MP",
        gameId: "def456",
        sessionName: "",
        sectionName: "",
        eventDate: new Date(Date.now() - 86400000).toISOString(),
        tables: 5,
        leadCardRequired: true,
        status: "COMPLETE",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 3,
        eventName: "Wednesday Evening Teams",
        director: null,
        gameType: "PAIRS",
        scoringType: "IMP",
        gameId: "ghi789",
        sessionName: "",
        sectionName: "",
        eventDate: new Date(Date.now() - 172800000).toISOString(),
        tables: 4,
        leadCardRequired: true,
        status: "CREATED",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    isLoading: false,
    games: [],
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    games: [],
  },
};
