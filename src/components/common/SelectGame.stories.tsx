import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SelectGame } from "./SelectGame";

const meta: Meta<typeof SelectGame> = {
  title: "Components/Common/SelectGame",
  component: SelectGame,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SelectGame>;

export const Default: Story = {
  args: {
    games: [
      {
        eventName: "Monday AM Pairs",
        director: null,
        gameType: "PAIRS",
        scoringType: "MP",
        sessionName: "",
        sectionName: "",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        eventName: "Monday PM Pairs",
        director: null,
        gameType: "PAIRS",
        scoringType: "MP",
        sessionName: "Session 1",
        sectionName: "",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        eventName: "Tuesday PM Pairs",
        director: null,
        gameType: "PAIRS",
        scoringType: "MP",
        sessionName: "",
        sectionName: "Section A",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        eventName: "Wednesday PM Pairs",
        director: null,
        gameType: "PAIRS",
        scoringType: "MP",
        sessionName: "Session 1",
        sectionName: "Section A",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
};

export const NoGames: Story = {
  args: {
    games: [],
  },
};
